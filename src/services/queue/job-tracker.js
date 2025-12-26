/**
 * Job Tracker - Track print job status in memory
 * Keeps history of recent print jobs
 */
class JobTracker {
  constructor() {
    this.jobs = new Map();
    this.maxJobs = 1000; // Keep last 1000 jobs in memory
  }

  /**
   * Create a new job
   * @param {string} jobId - Unique job ID
   * @param {string} status - Initial status
   * @param {Object} metadata - Additional job metadata
   */
  create(jobId, status, metadata = {}) {
    this.jobs.set(jobId, {
      jobId,
      status,
      ...metadata,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Cleanup old jobs if exceeding limit
    this.cleanup();
  }

  /**
   * Update job status
   * @param {string} jobId - Job ID
   * @param {string} status - New status
   * @param {string} error - Error message (optional)
   */
  update(jobId, status, error = null) {
    const job = this.jobs.get(jobId);

    if (job) {
      job.status = status;
      job.updatedAt = Date.now();

      if (error) {
        job.error = error;
      }

      if (status === 'completed') {
        job.completedAt = Date.now();
        job.duration = job.completedAt - job.createdAt;
      }
    }
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job object or null
   */
  get(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get recent jobs
   * @param {number} limit - Max number of jobs to return
   * @returns {Array} Array of job objects
   */
  getRecent(limit = 50) {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get jobs by status
   * @param {string} status - Job status
   * @returns {Array} Array of job objects
   */
  getByStatus(status) {
    return Array.from(this.jobs.values())
      .filter(job => job.status === status)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get statistics
   * @returns {Object} Job statistics
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());

    const stats = {
      total: jobs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    jobs.forEach(job => {
      if (stats[job.status] !== undefined) {
        stats[job.status]++;
      }
    });

    // Calculate average duration for completed jobs
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.duration);
    if (completedJobs.length > 0) {
      const totalDuration = completedJobs.reduce((sum, j) => sum + j.duration, 0);
      stats.averageDuration = Math.round(totalDuration / completedJobs.length);
    }

    return stats;
  }

  /**
   * Cleanup old jobs
   * Keep only the most recent maxJobs entries
   */
  cleanup() {
    if (this.jobs.size > this.maxJobs) {
      // Sort by creation time
      const sorted = Array.from(this.jobs.entries())
        .sort(([, a], [, b]) => b.createdAt - a.createdAt);

      // Keep only newest maxJobs
      this.jobs.clear();
      sorted.slice(0, this.maxJobs).forEach(([id, job]) => {
        this.jobs.set(id, job);
      });
    }
  }

  /**
   * Clear all jobs
   */
  clear() {
    this.jobs.clear();
  }
}

// Export singleton instance
module.exports = new JobTracker();
