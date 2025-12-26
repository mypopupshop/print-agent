const async = require('async');
const logger = require('../../utils/logger');
const jobTracker = require('./job-tracker');
const printerPool = require('../printers/printer-pool');
const { generateJobId } = require('../../utils/job-id-generator');

/**
 * Print Queue - Manages print job queue with retry logic
 * Singleton instance
 */
class PrintQueue {
  constructor() {
    this.queue = null;
    this.config = null;
  }

  /**
   * Initialize print queue with configuration
   * @param {Object} config - Application configuration
   */
  initialize(config) {
    this.config = config;

    // Create async queue with concurrency of 1
    // This ensures prints happen sequentially, preventing conflicts
    this.queue = async.queue(
      async (task) => await this.processJob(task),
      config.queueConcurrency || 1
    );

    // Queue event handlers
    this.queue.error((error, task) => {
      logger.error(`Queue error for job ${task.jobId}:`, error);
      jobTracker.update(task.jobId, 'failed', error.message);
    });

    this.queue.drain(() => {
      logger.debug('Print queue drained (all jobs processed)');
    });

    logger.info(`Print queue initialized (concurrency: ${config.queueConcurrency || 1})`);
  }

  /**
   * Enqueue a new print job
   * Returns immediately with jobId (non-blocking)
   *
   * @param {string} printerType - Printer type (epson, tsc, a4)
   * @param {any} data - Print data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Job info with jobId and status
   */
  async enqueue(printerType, data, options = {}) {
    const jobId = generateJobId();

    const job = {
      jobId,
      printerType,
      data,
      options,
      attempts: 0,
      maxAttempts: this.config.retryAttempts || 3,
      retryDelay: this.config.retryDelay || 2000,
      createdAt: Date.now()
    };

    // Track job
    jobTracker.create(jobId, 'pending', {
      printerType,
      attempts: 0
    });

    // Add to queue
    this.queue.push(job, (err) => {
      if (err) {
        logger.error(`Job ${jobId} failed:`, err);
        jobTracker.update(jobId, 'failed', err.message);
      }
    });

    logger.info(`Job ${jobId} enqueued for ${printerType} printer`);

    // Return immediately (non-blocking)
    return {
      status: 'ok',
      jobId
    };
  }

  /**
   * Process a print job
   * Handles printing and retry logic
   *
   * @param {Object} job - Job object
   */
  async processJob(job) {
    const { jobId, printerType, data, attempts, maxAttempts, retryDelay } = job;

    try {
      // Update status to processing
      jobTracker.update(jobId, 'processing');
      logger.info(`Processing job ${jobId} for ${printerType} (attempt ${attempts + 1}/${maxAttempts})`);

      // Get printer from pool
      const printer = await printerPool.getPrinter(printerType);

      // Print
      const startTime = Date.now();
      await printer.print(data);
      const duration = Date.now() - startTime;

      // Success
      jobTracker.update(jobId, 'completed');
      logger.info(`✓ Job ${jobId} completed successfully in ${duration}ms`);

      return {
        jobId,
        status: 'completed',
        duration
      };

    } catch (error) {
      logger.error(`✗ Job ${jobId} failed (attempt ${attempts + 1}/${maxAttempts}):`, error.message);

      job.attempts++;

      // Check if we should retry
      if (job.attempts < maxAttempts) {
        // Calculate exponential backoff delay
        const delay = retryDelay * Math.pow(2, job.attempts - 1);
        logger.info(`Retrying job ${jobId} in ${delay}ms...`);

        // Update job tracker
        jobTracker.update(jobId, 'pending', `Retry ${job.attempts}/${maxAttempts}`);

        // Wait before retry
        await this.sleep(delay);

        // Re-enqueue job
        this.queue.push(job);

      } else {
        // Max retries exceeded
        const errorMsg = `Job failed after ${maxAttempts} attempts: ${error.message}`;
        logger.error(`Job ${jobId}: ${errorMsg}`);
        jobTracker.update(jobId, 'failed', errorMsg);

        throw new Error(errorMsg);
      }
    }
  }

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getStatus() {
    if (!this.queue) {
      return {
        initialized: false,
        pending: 0,
        active: 0
      };
    }

    return {
      initialized: true,
      pending: this.queue.length(),
      active: this.queue.running(),
      concurrency: this.queue.concurrency
    };
  }

  /**
   * Get job info by ID
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job info or null
   */
  getJob(jobId) {
    return jobTracker.get(jobId);
  }

  /**
   * Get recent jobs
   * @param {number} limit - Max jobs to return
   * @returns {Array} Recent jobs
   */
  getRecentJobs(limit = 50) {
    return jobTracker.getRecent(limit);
  }

  /**
   * Get queue statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return jobTracker.getStats();
  }

  /**
   * Pause the queue
   */
  pause() {
    if (this.queue) {
      this.queue.pause();
      logger.info('Print queue paused');
    }
  }

  /**
   * Resume the queue
   */
  resume() {
    if (this.queue) {
      this.queue.resume();
      logger.info('Print queue resumed');
    }
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new PrintQueue();
