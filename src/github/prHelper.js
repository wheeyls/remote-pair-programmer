import { Octokit } from '@octokit/rest';

class PRHelper {
  constructor({ octokit, owner, repo, prNumber }) {
    this.octokit = octokit;
    this.owner = owner;
    this.repo = repo;
    this.prNumber = prNumber;
  }

  async getDetails() {
    if (this.details) {
      return this.details;
    }

    const { data: prData } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
    });

    return (this.details = prData);
  }

  async isPR() {
    const data = await this.getDetails();

    let issue;
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return false;
      }
      issue = data[0];
    } else {
      issue = data;
    }

    return issue.pull_request !== undefined;
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
