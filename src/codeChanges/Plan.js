import PROMPTS from '../prompts.js';

export class Plan {
  constructor(contextContent, aiClient) {
    this.contextContent = contextContent;
    this.aiClient = aiClient;
    this.plan = null;
  }

  async getPlan() {
    if (this.plan) {
      return this.plan;
    }

    return (this.plan = await this.generatePlan());
  }

  async generatePlan() {
    const context = this.contextContent.toString();
    console.log('Generating plan...');
    const response = await this.aiClient.generateCompletion({
      prompt: PROMPTS.CODE_PLANNING,
      context: context,
      modelStrength: 'strong',
      temperature: 0.2,
    });
    const plan = this.extractPlan(response);
    console.log('Plan generated:', plan);

    return plan;
  }

  extractPlan(response) {
    const planMatch = response.match(/PLAN:\s*([\s\S]*?)(?:\s*ENDPLAN|\s*$)/i);

    if (planMatch && planMatch[1]) {
      return planMatch[1].trim();
    }

    return response.trim();
  }
}
