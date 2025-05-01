import { Octokit } from '@octokit/rest';

class PRHelper {
  constructor({ octokit, owner, repo, prNumber }) {
    this.octokit = octokit;
    this.owner = owner;
    this.repo = repo;
    this.prNumber = prNumber;
  }

  async toContext() {
    const prDetails = await this.getDetails();
    const files = await this.getFiles();
    const comments = await this.getComments();
    const isPR = await this.isPR();

    return {
      prNumber: this.prNumber,
      owner: this.owner,
      repo: this.repo,
      body: prDetails.body,
      title: prDetails.title,
      isPR,
      files,
      comments,
    };
  }

  async getDetails() {
    if (this.details) {
      return this.details;
    }

    const { data: prData } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
    });

    return (this.details = prData);
  }

  async isPR() {
    if (this.isPRValue !== undefined) {
      return this.isPRValue;
    }

    // First, try to get the issue to check if it exists
    const { data } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.prNumber,
    });

    let issue;
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return false;
      }
      issue = data[0];
    } else {
      issue = data;
    }

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
