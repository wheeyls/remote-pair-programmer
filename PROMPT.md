I use aider every day in my command line. The behavior is simple enough:

I ask for changes.
Aider commits code.
I review the changes.
I might make a few edits.
Aider applies changes based on my feedback.

I want this moved into the cloud. I want to be on my phone, look at my github repo, and add a comment to a PR from where I am. I put my phone away and check later, and see the progress made my an AI coding agent.

Let's move this into the cloud.

This directory is the beginning of that journey. It is a simple github action that will listen to comments on PRs, and and add it's own comments.

Let's update the functionality so that it can actually commit code and push it to the PR.
