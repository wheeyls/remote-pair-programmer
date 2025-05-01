import { getOctokit } from '../providers/octokitProvider.js';

class PRHelper {
  constructor({ octokit, owner, repo, prNumber }) {
    this.octokit = octokit || getOctokit();
    this.owner = owner;
    this.repo = repo;
    this.prNumber = prNumber;
  }

  async toContext() {
    const prDetails = await this.getDetails();
    const files = await this.getFiles();
    const comments = await this.getComments();
    const isPR = await this.isPR();

    // Extract just the filenames from the files array
    const fileNames = files
      .map((file) => file.filename)
      .filter((name) => typeof name === 'string');

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
}

export { PRHelper };
