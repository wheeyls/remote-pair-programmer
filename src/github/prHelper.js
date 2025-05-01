import { getOctokit } from '../providers/octokitProvider.js';
import addIssueComment from '../utils/commentUtils.js';

class PRHelper {
  constructor({ octokit, owner, repo, prNumber, reviewCommentId, issueCommentId }) {
    this.octokit = octokit || getOctokit();
    this.owner = owner;
    this.repo = repo;
    this.prNumber = prNumber;
    this.reviewCommentId = reviewCommentId;
    this.issueCommentId = issueCommentId;
  }

  async toContext() {
    const prDetails = await this.getDetails();
    const files = await this.getFiles();
    const comments = await this.getComments();
    const isPR = await this.isPR();
    const reviewComment = await this.getReviewComment();

    // Extract just the filenames from the files array
    const fileNames = files
      .map((file) => file.filename)
      .filter((name) => typeof name === 'string');

    const diff = await this.getDiff();

    return {
      prNumber: this.prNumber,
      owner: this.owner,
      repo: this.repo,
      body: prDetails.body,
      title: prDetails.title,
      isPR,
      files,
      fileNames, // Add the array of just filenames
      comments,
      diff,
    };
  }

  async getDetails() {
    if (await this.isPR()) {
      return await this.getPullDetails();
    } else {
      return await this.getIssueDetails();
    }
  }

  async getPullDetails() {
    if (this.pullDetails) {
      return this.pullDetails;
    }

    if (!(await this.isPR())) {
      throw new Error('Not a pull request');
    }

    const { data: prData } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
    });

    return (this.details = prData);
  }

  async getIssueDetails() {
    if (this.issueDetails !== undefined) {
      return this.issueDetails;
    }
    const { data: issueData } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.prNumber,
    });

    if (Array.isArray(issueData)) {
      this.issueDetails = issueData[0] || false;
    } else {
      this.issueDetails = issueData;
    }

    return this.issueDetails;
  }

  async isPR() {
    if (this.isPRValue !== undefined) {
      return this.isPRValue;
    }

    const issue = await this.getIssueDetails();

    return (this.isPRValue = issue.pull_request !== undefined);
  }

  async getFiles() {
    if (!(await this.isPR())) {
      return [];
    }

    const { data: files } = await this.octokit.pulls.listFiles({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
    });

    return files;
  }

  async getComments() {
    const { data: comments } = await this.octokit.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.prNumber,
    });
    return comments;
  }

  async getTitle() {
    const prDetails = await this.getDetails();
    return prDetails.title;
  }

  async getBody() {
    const prDetails = await this.getDetails();
    return prDetails.body;
  }

  async getBranchName() {
    if (await this.isPR()) {
      const prDetails = await this.getPullDetails();
      return prDetails.head.ref;
    }

    return `ai-bot/ai-changes-issue-${this.prNumber}`;
  }

  async getRepoData() {
    if (this.repoData) {
      return this.repoData;
    }
    const { data } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });
    this.repoData = data;
    return data;
  }

  async getCloneUrl() {
    if (await this.isPR()) {
      const prDetails = await this.getPullDetails();
      return prDetails.head.repo.clone_url;
    } else {
      return (await this.getRepoData()).clone_url;
    }
  }

  async getDiff() {
    if (!(await this.isPR())) {
      return null;
    }
    try {
      const { data: diffData } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
        mediaType: {
          format: 'diff',
        },
      });
      return diffData;
    } catch (error) {
      console.warn('Failed to fetch PR diff:', error);
      return null;
    }
  }

  async getReviewComment() {
    if (!this.reviewCommentId) {
      return null;
    }

    if (!(await this.isPR())) {
      return null;
    }

    if (this.reviewComment) {
      return this.reviewComment;
    }

    const { data: reviewComment } = await this.octokit.pulls.getReviewComment({
      owner: this.owner,
      repo: this.repo,
      comment_id: this.reviewCommentId,
    });

    this.reviewComment = {
      body: reviewComment.body,
      path: reviewComment.path,
      line: reviewComment.line,
      diff_hunk: reviewComment.diff_hunk,
      position: reviewComment.position,
      commit_id: reviewComment.commit_id,
    };

    return this.reviewComment;
  }

  /**
   * Add a comment to the PR/issue
   * @param {Object} options - Comment options
   * @param {string} options.body - Comment body
   * @param {string} [options.quote_reply_to] - Text to quote in the reply
   * @returns {Promise<Object>} - Comment creation result
   */
  async addComment({ body }) {
    let issueSignature = '';

    if (!(await this.isPR())) {
      issueSignature = `\n\nYou can create a PR from this branch manually or use the following URL:\nhttps://github.com/${
        this.owner
      }/${this.repo}/compare/main...${await this.getBranchName()}?expand=1`;
    }

    return await addIssueComment({
      octokit: this.octokit,
      owner: this.owner,
      repo: this.repo,
      issue_number: this.prNumber,
      body: body + issueSignature,
    });
  }

  async addReaction() {
    try {
      // Add a light-bulb reaction to indicate the bot has started work
      if (this.issueCommentId) {
        await this.octokit.reactions.createForIssueComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: this.issueCommentId,
          content: 'rocket',
        });
      } else {
        await this.octokit.reactions.createForIssue({
          owner: this.owner,
          repo: this.repo,
          issue_number: this.prNumber,
          content: 'rocket',
        });
      }
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  }
}

export { PRHelper };
