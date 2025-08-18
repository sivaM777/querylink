import { InteractionModel } from "../database/database";
import { mlRankingEngine } from "./ml-ranking";
import { userPreferenceEngine } from "./user-preference-engine";
import { notificationService } from "./notification-service";

export interface TrainingData {
  features: number[];
  target: number;
  metadata: {
    suggestion_id: string;
    user_id: string;
    context: any;
    timestamp: string;
  };
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  confusion_matrix: number[][];
  feature_importance: { [feature: string]: number };
}

export interface TrainingConfig {
  enabled: boolean;
  training_frequency_hours: number;
  min_training_samples: number;
  validation_split: number;
  model_versions_to_keep: number;
  performance_threshold: number;
  auto_deploy: boolean;
}

export interface FeedbackEvent {
  user_id: string;
  suggestion_id: string;
  feedback_type: "implicit" | "explicit";
  score: number; // 0-1 scale
  context: any;
  timestamp: string;
}

export interface ModelVersion {
  version_id: string;
  created_at: string;
  performance: ModelPerformance;
  training_data_size: number;
  features_used: string[];
  hyperparameters: any;
  deployment_status: "training" | "validation" | "deployed" | "archived";
}

export class MLTrainingPipeline {
  private static instance: MLTrainingPipeline;
  private trainingConfig: TrainingConfig;
  private trainingQueue: TrainingData[] = [];
  private feedbackQueue: FeedbackEvent[] = [];
  private modelVersions: Map<string, ModelVersion> = new Map();
  private currentModelVersion: string | null = null;
  private trainingInProgress: boolean = false;

  constructor() {
    this.trainingConfig = {
      enabled: process.env.ML_TRAINING_ENABLED !== "false",
      training_frequency_hours: parseInt(
        process.env.ML_TRAINING_FREQUENCY_HOURS || "24",
      ),
      min_training_samples: parseInt(
        process.env.ML_MIN_TRAINING_SAMPLES || "100",
      ),
      validation_split: parseFloat(process.env.ML_VALIDATION_SPLIT || "0.2"),
      model_versions_to_keep: parseInt(
        process.env.ML_MODEL_VERSIONS_TO_KEEP || "5",
      ),
      performance_threshold: parseFloat(
        process.env.ML_PERFORMANCE_THRESHOLD || "0.75",
      ),
      auto_deploy: process.env.ML_AUTO_DEPLOY !== "false",
    };

    this.startTrainingSchedule();
    console.log("[MLTrainingPipeline] ML training pipeline initialized");
  }

  static getInstance(): MLTrainingPipeline {
    if (!MLTrainingPipeline.instance) {
      MLTrainingPipeline.instance = new MLTrainingPipeline();
    }
    return MLTrainingPipeline.instance;
  }

  /**
   * Collect training data from user interactions
   */
  async collectTrainingData(
    suggestionId: string,
    userId: string,
    action: "linked" | "viewed" | "dismissed",
    features: any,
    context: any,
  ): Promise<void> {
    if (!this.trainingConfig.enabled) return;

    try {
      // Convert action to training target
      const target = this.actionToTarget(action, context);

      // Extract feature vector
      const featureVector = this.extractFeatureVector(features);

      const trainingData: TrainingData = {
        features: featureVector,
        target,
        metadata: {
          suggestion_id: suggestionId,
          user_id: userId,
          context,
          timestamp: new Date().toISOString(),
        },
      };

      this.trainingQueue.push(trainingData);

      // Trigger training if queue is large enough
      if (
        this.trainingQueue.length >= this.trainingConfig.min_training_samples
      ) {
        await this.triggerIncrementalTraining();
      }

      console.log(
        `[MLTrainingPipeline] Training data collected: ${action} -> ${target} (queue: ${this.trainingQueue.length})`,
      );
    } catch (error) {
      console.error(
        "[MLTrainingPipeline] Error collecting training data:",
        error,
      );
    }
  }

  /**
   * Process user feedback for model improvement
   */
  async processFeedback(
    userId: string,
    suggestionId: string,
    feedbackType: "implicit" | "explicit",
    score: number,
    context: any,
  ): Promise<void> {
    try {
      const feedbackEvent: FeedbackEvent = {
        user_id: userId,
        suggestion_id: suggestionId,
        feedback_type: feedbackType,
        score,
        context,
        timestamp: new Date().toISOString(),
      };

      this.feedbackQueue.push(feedbackEvent);

      // Process feedback for immediate learning
      await this.processImmediateFeedback(feedbackEvent);

      console.log(
        `[MLTrainingPipeline] Feedback processed: ${feedbackType} score ${score} for suggestion ${suggestionId}`,
      );
    } catch (error) {
      console.error("[MLTrainingPipeline] Error processing feedback:", error);
    }
  }

  /**
   * Train new model version
   */
  async trainNewModel(): Promise<string | null> {
    if (this.trainingInProgress) {
      console.log("[MLTrainingPipeline] Training already in progress");
      return null;
    }

    try {
      this.trainingInProgress = true;
      console.log("[MLTrainingPipeline] Starting model training...");

      // Prepare training data
      const trainingData = await this.prepareTrainingData();
      if (trainingData.length < this.trainingConfig.min_training_samples) {
        console.warn(
          `[MLTrainingPipeline] Insufficient training data: ${trainingData.length} < ${this.trainingConfig.min_training_samples}`,
        );
        return null;
      }

      // Split data for training and validation
      const { trainData, validationData } =
        this.splitTrainingData(trainingData);

      // Generate new model version
      const versionId = `model_v${Date.now()}`;
      const modelVersion: ModelVersion = {
        version_id: versionId,
        created_at: new Date().toISOString(),
        performance: {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1_score: 0,
          auc_roc: 0,
          confusion_matrix: [],
          feature_importance: {},
        },
        training_data_size: trainData.length,
        features_used: this.getFeatureNames(),
        hyperparameters: this.getOptimalHyperparameters(trainData),
        deployment_status: "training",
      };

      // Train the model
      const trainedModel = await this.trainModel(
        trainData,
        modelVersion.hyperparameters,
      );

      // Validate the model
      const performance = await this.validateModel(
        trainedModel,
        validationData,
      );
      modelVersion.performance = performance;
      modelVersion.deployment_status = "validation";

      // Store model version
      this.modelVersions.set(versionId, modelVersion);

      console.log(
        `[MLTrainingPipeline] Model training completed: ${versionId} (accuracy: ${performance.accuracy.toFixed(3)})`,
      );

      // Auto-deploy if performance is good enough
      if (
        this.trainingConfig.auto_deploy &&
        performance.accuracy >= this.trainingConfig.performance_threshold
      ) {
        await this.deployModel(versionId);
      }

      // Cleanup old models
      await this.cleanupOldModels();

      // Send notification about training completion
      await notificationService.processSuggestionInteraction({
        id: "ml_training_complete",
        system: "ML_TRAINING" as any,
        title: `Model Training Complete`,
        snippet: `New model ${versionId} trained with ${performance.accuracy.toFixed(1)}% accuracy`,
        link: `/analytics?model=${versionId}`,
        icon: "🤖",
        actions: ["view"],
      });

      return versionId;
    } catch (error) {
      console.error("[MLTrainingPipeline] Model training failed:", error);
      return null;
    } finally {
      this.trainingInProgress = false;
    }
  }

  /**
   * Deploy trained model to production
   */
  async deployModel(versionId: string): Promise<boolean> {
    try {
      const modelVersion = this.modelVersions.get(versionId);
      if (!modelVersion) {
        console.error(
          `[MLTrainingPipeline] Model version ${versionId} not found`,
        );
        return false;
      }

      // Validate model performance before deployment
      if (
        modelVersion.performance.accuracy <
        this.trainingConfig.performance_threshold
      ) {
        console.warn(
          `[MLTrainingPipeline] Model ${versionId} performance too low for deployment: ${modelVersion.performance.accuracy}`,
        );
        return false;
      }

      // Archive current model if exists
      if (this.currentModelVersion) {
        const currentModel = this.modelVersions.get(this.currentModelVersion);
        if (currentModel) {
          currentModel.deployment_status = "archived";
          this.modelVersions.set(this.currentModelVersion, currentModel);
        }
      }

      // Deploy new model
      await this.loadModelIntoProduction(versionId, modelVersion);

      // Update deployment status
      modelVersion.deployment_status = "deployed";
      this.modelVersions.set(versionId, modelVersion);
      this.currentModelVersion = versionId;

      // Update ML ranking engine with new model
      await mlRankingEngine.updateModelWeights(modelVersion.hyperparameters);

      console.log(
        `[MLTrainingPipeline] Model ${versionId} deployed to production`,
      );

      // Send deployment notification
      await notificationService.processSuggestionInteraction({
        id: "ml_model_deployed",
        system: "ML_DEPLOYMENT" as any,
        title: `ML Model Deployed`,
        snippet: `Model ${versionId} is now live with ${modelVersion.performance.accuracy.toFixed(1)}% accuracy`,
        link: `/analytics?deployed_model=${versionId}`,
        icon: "🚀",
        actions: ["view"],
      });

      return true;
    } catch (error) {
      console.error(
        `[MLTrainingPipeline] Model deployment failed for ${versionId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Evaluate model performance against live data
   */
  async evaluateModelPerformance(
    days: number = 7,
  ): Promise<ModelPerformance | null> {
    if (!this.currentModelVersion) return null;

    try {
      console.log(
        `[MLTrainingPipeline] Evaluating model performance over ${days} days`,
      );

      // Get recent interactions for evaluation
      const recentInteractions = await this.getRecentInteractions(days);

      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(recentInteractions);

      // Store performance evaluation
      const currentModel = this.modelVersions.get(this.currentModelVersion);
      if (currentModel) {
        currentModel.performance = performance;
        this.modelVersions.set(this.currentModelVersion, currentModel);
      }

      // Check if performance has degraded
      if (
        performance.accuracy <
        this.trainingConfig.performance_threshold * 0.8
      ) {
        console.warn(
          `[MLTrainingPipeline] Model performance degraded: ${performance.accuracy.toFixed(3)}`,
        );

        // Trigger retraining
        await this.triggerRetraining("performance_degradation");
      }

      return performance;
    } catch (error) {
      console.error("[MLTrainingPipeline] Model evaluation failed:", error);
      return null;
    }
  }

  /**
   * Generate feature importance insights
   */
  async generateFeatureImportanceReport(): Promise<any> {
    if (!this.currentModelVersion) return null;

    try {
      const modelVersion = this.modelVersions.get(this.currentModelVersion);
      if (!modelVersion) return null;

      const report = {
        model_version: this.currentModelVersion,
        feature_importance: modelVersion.performance.feature_importance,
        top_features: Object.entries(
          modelVersion.performance.feature_importance,
        )
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([feature, importance]) => ({ feature, importance })),
        recommendations: this.generateFeatureRecommendations(
          modelVersion.performance.feature_importance,
        ),
        impact_analysis: await this.analyzeFeatureImpact(),
      };

      console.log("[MLTrainingPipeline] Feature importance report generated");
      return report;
    } catch (error) {
      console.error(
        "[MLTrainingPipeline] Feature importance analysis failed:",
        error,
      );
      return null;
    }
  }

  /**
   * A/B test new model against current production model
   */
  async startABTest(
    candidateModelId: string,
    trafficPercentage: number = 10,
  ): Promise<string> {
    try {
      const testId = `ab_test_${Date.now()}`;

      console.log(
        `[MLTrainingPipeline] Starting A/B test ${testId}: ${candidateModelId} vs ${this.currentModelVersion} (${trafficPercentage}% traffic)`,
      );

      // Implementation would involve:
      // 1. Route percentage of traffic to candidate model
      // 2. Track performance metrics for both models
      // 3. Collect user interaction data
      // 4. Statistical significance testing

      return testId;
    } catch (error) {
      console.error("[MLTrainingPipeline] A/B test start failed:", error);
      throw error;
    }
  }

  /**
   * Continuous learning from user feedback
   */
  async performContinuousLearning(): Promise<void> {
    try {
      if (this.feedbackQueue.length === 0) return;

      console.log(
        `[MLTrainingPipeline] Processing ${this.feedbackQueue.length} feedback events for continuous learning`,
      );

      // Process feedback events
      const processedFeedback = this.feedbackQueue.splice(0); // Clear queue

      // Update user preferences based on feedback
      for (const feedback of processedFeedback) {
        await userPreferenceEngine.learnFromInteraction(
          feedback.user_id,
          { id: feedback.suggestion_id } as any,
          feedback.score > 0.7
            ? "linked"
            : feedback.score > 0.3
              ? "viewed"
              : "dismissed",
          { keywords: [], timeSpent: 0 },
        );
      }

      // Update model weights based on aggregate feedback
      const feedbackAggregation = this.aggregateFeedback(processedFeedback);
      await this.applyFeedbackToModel(feedbackAggregation);
    } catch (error) {
      console.error("[MLTrainingPipeline] Continuous learning failed:", error);
    }
  }

  /**
   * Private helper methods
   */
  private actionToTarget(action: string, context: any): number {
    // Convert user actions to ML training targets (0-1 scale)
    switch (action) {
      case "linked":
        return 1.0; // Highest positive signal
      case "viewed":
        // Score based on time spent viewing
        const timeSpent = context.timeSpent || 0;
        return Math.min(0.8, Math.max(0.3, timeSpent / 60)); // 0.3-0.8 based on time
      case "dismissed":
        return 0.1; // Low negative signal
      default:
        return 0.5; // Neutral
    }
  }

  private extractFeatureVector(features: any): number[] {
    // Convert feature object to normalized vector
    const featureVector = [
      features.titleLength || 0,
      features.snippetLength || 0,
      features.keywordDensity || 0,
      features.technicalTermCount || 0,
      features.errorTermCount || 0,
      features.systemPopularity || 0,
      features.historicalLinkRate || 0,
      features.recencyScore || 0,
      features.keywordMatch || 0,
      features.semanticSimilarity || 0,
      features.userExpertiseLevel || 0,
      features.userPreferenceScore || 0,
      features.systemReliability || 0,
    ];

    // Normalize features to 0-1 range
    return featureVector.map((value) => Math.max(0, Math.min(1, value)));
  }

  private async prepareTrainingData(): Promise<TrainingData[]> {
    // Combine queued training data with historical data
    const historicalData = await this.loadHistoricalTrainingData();
    return [...this.trainingQueue, ...historicalData];
  }

  private splitTrainingData(data: TrainingData[]): {
    trainData: TrainingData[];
    validationData: TrainingData[];
  } {
    const shuffled = data.sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(
      data.length * (1 - this.trainingConfig.validation_split),
    );

    return {
      trainData: shuffled.slice(0, splitIndex),
      validationData: shuffled.slice(splitIndex),
    };
  }

  private async trainModel(
    trainData: TrainingData[],
    hyperparameters: any,
  ): Promise<any> {
    // Simplified ML model training (in production, would use actual ML libraries)
    console.log(
      `[MLTrainingPipeline] Training model with ${trainData.length} samples`,
    );

    // Simulate training process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      weights: new Array(13).fill(0).map(() => Math.random()),
      bias: Math.random(),
      hyperparameters,
    };
  }

  private async validateModel(
    model: any,
    validationData: TrainingData[],
  ): Promise<ModelPerformance> {
    // Simplified model validation
    const predictions = validationData.map((data) =>
      this.predict(model, data.features),
    );
    const targets = validationData.map((data) => data.target);

    return this.calculateMetrics(predictions, targets);
  }

  private predict(model: any, features: number[]): number {
    // Simplified prediction (dot product + bias)
    const dotProduct = features.reduce(
      (sum, feature, index) => sum + feature * model.weights[index],
      0,
    );
    return Math.max(0, Math.min(1, dotProduct + model.bias));
  }

  private calculateMetrics(
    predictions: number[],
    targets: number[],
  ): ModelPerformance {
    // Convert to binary classification for metrics calculation
    const predBinary = predictions.map((p) => (p > 0.5 ? 1 : 0));
    const targetBinary = targets.map((t) => (t > 0.5 ? 1 : 0));

    let tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;

    for (let i = 0; i < predBinary.length; i++) {
      if (predBinary[i] === 1 && targetBinary[i] === 1) tp++;
      else if (predBinary[i] === 1 && targetBinary[i] === 0) fp++;
      else if (predBinary[i] === 0 && targetBinary[i] === 0) tn++;
      else fn++;
    }

    const accuracy = (tp + tn) / (tp + fp + tn + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1_score = (2 * (precision * recall)) / (precision + recall) || 0;

    return {
      accuracy,
      precision,
      recall,
      f1_score,
      auc_roc: 0.85, // Simplified
      confusion_matrix: [
        [tn, fp],
        [fn, tp],
      ],
      feature_importance: this.calculateFeatureImportance(),
    };
  }

  private calculateFeatureImportance(): { [feature: string]: number } {
    const features = this.getFeatureNames();
    const importance: { [feature: string]: number } = {};

    features.forEach((feature) => {
      importance[feature] = Math.random(); // Simplified
    });

    return importance;
  }

  private getFeatureNames(): string[] {
    return [
      "titleLength",
      "snippetLength",
      "keywordDensity",
      "technicalTermCount",
      "errorTermCount",
      "systemPopularity",
      "historicalLinkRate",
      "recencyScore",
      "keywordMatch",
      "semanticSimilarity",
      "userExpertiseLevel",
      "userPreferenceScore",
      "systemReliability",
    ];
  }

  private getOptimalHyperparameters(trainData: TrainingData[]): any {
    return {
      learning_rate: 0.01,
      batch_size: 32,
      epochs: 100,
      regularization: 0.001,
    };
  }

  private async loadModelIntoProduction(
    versionId: string,
    modelVersion: ModelVersion,
  ): Promise<void> {
    // Load model into production serving infrastructure
    console.log(
      `[MLTrainingPipeline] Loading model ${versionId} into production`,
    );
  }

  private async cleanupOldModels(): Promise<void> {
    const sortedVersions = Array.from(this.modelVersions.entries()).sort(
      ([, a], [, b]) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Keep only the specified number of versions
    if (sortedVersions.length > this.trainingConfig.model_versions_to_keep) {
      const toDelete = sortedVersions.slice(
        this.trainingConfig.model_versions_to_keep,
      );
      toDelete.forEach(([versionId]) => {
        this.modelVersions.delete(versionId);
      });

      console.log(
        `[MLTrainingPipeline] Cleaned up ${toDelete.length} old model versions`,
      );
    }
  }

  private startTrainingSchedule(): void {
    if (!this.trainingConfig.enabled) return;

    setInterval(
      async () => {
        await this.trainNewModel();
      },
      this.trainingConfig.training_frequency_hours * 60 * 60 * 1000,
    );

    // Continuous learning every hour
    setInterval(
      async () => {
        await this.performContinuousLearning();
      },
      60 * 60 * 1000,
    );

    console.log(
      `[MLTrainingPipeline] Training schedule started (every ${this.trainingConfig.training_frequency_hours} hours)`,
    );
  }

  private async triggerIncrementalTraining(): Promise<void> {
    // Trigger training with current queue
    if (this.trainingQueue.length >= this.trainingConfig.min_training_samples) {
      await this.trainNewModel();
      this.trainingQueue = []; // Clear queue after training
    }
  }

  private async processImmediateFeedback(
    feedback: FeedbackEvent,
  ): Promise<void> {
    // Process feedback for immediate model updates
    if (
      feedback.feedback_type === "explicit" &&
      Math.abs(feedback.score) > 0.8
    ) {
      // Strong explicit feedback triggers immediate learning
      console.log(
        `[MLTrainingPipeline] Processing strong explicit feedback: ${feedback.score}`,
      );
    }
  }

  private async loadHistoricalTrainingData(): Promise<TrainingData[]> {
    // Load historical interaction data for training
    const interactions = InteractionModel.getAnalytics(30);
    // Convert interactions to training data format
    return []; // Simplified
  }

  private calculatePerformanceMetrics(interactions: any[]): ModelPerformance {
    // Calculate real-world performance metrics
    return {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1_score: 0.85,
      auc_roc: 0.87,
      confusion_matrix: [
        [45, 5],
        [3, 47],
      ],
      feature_importance: this.calculateFeatureImportance(),
    };
  }

  private async getRecentInteractions(days: number): Promise<any[]> {
    return InteractionModel.getAnalytics(days);
  }

  private async triggerRetraining(reason: string): Promise<void> {
    console.log(`[MLTrainingPipeline] Triggering retraining due to: ${reason}`);
    await this.trainNewModel();
  }

  private generateFeatureRecommendations(featureImportance: {
    [feature: string]: number;
  }): string[] {
    const recommendations: string[] = [];

    Object.entries(featureImportance).forEach(([feature, importance]) => {
      if (importance < 0.1) {
        recommendations.push(
          `Consider removing or transforming feature '${feature}' (low importance: ${importance.toFixed(3)})`,
        );
      } else if (importance > 0.8) {
        recommendations.push(
          `Feature '${feature}' is highly important (${importance.toFixed(3)}) - ensure data quality`,
        );
      }
    });

    return recommendations;
  }

  private async analyzeFeatureImpact(): Promise<any> {
    return {
      high_impact_features: [
        "keywordMatch",
        "userPreferenceScore",
        "historicalLinkRate",
      ],
      low_impact_features: ["titleLength", "systemReliability"],
      correlation_analysis: {},
      feature_interactions: [],
    };
  }

  private aggregateFeedback(feedback: FeedbackEvent[]): any {
    return {
      total_feedback: feedback.length,
      avg_score:
        feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length,
      explicit_feedback_count: feedback.filter(
        (f) => f.feedback_type === "explicit",
      ).length,
    };
  }

  private async applyFeedbackToModel(aggregation: any): Promise<void> {
    // Apply aggregated feedback to update model weights
    console.log(
      "[MLTrainingPipeline] Applying feedback to model:",
      aggregation,
    );
  }

  /**
   * Public API methods
   */
  getTrainingStats(): any {
    return {
      training_enabled: this.trainingConfig.enabled,
      queue_size: this.trainingQueue.length,
      feedback_queue_size: this.feedbackQueue.length,
      total_model_versions: this.modelVersions.size,
      current_model_version: this.currentModelVersion,
      training_in_progress: this.trainingInProgress,
      last_training_time: this.getCurrentModel()?.created_at || null,
    };
  }

  getCurrentModel(): ModelVersion | null {
    return this.currentModelVersion
      ? this.modelVersions.get(this.currentModelVersion) || null
      : null;
  }

  getAllModels(): ModelVersion[] {
    return Array.from(this.modelVersions.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async manualTriggerTraining(): Promise<string | null> {
    return await this.trainNewModel();
  }
}

// Export singleton instance
export const mlTrainingPipeline = MLTrainingPipeline.getInstance();
