const logger = require("../utils/logger");
const scoringAlgorithm = require("../utils/scoringAlgorithm");
const axios = require("axios");

class AIScoringService {
  constructor() {
    this.aiAvailable = true;
    // URL trỏ đến Docker container của Ollama (tên service là ollama, port 11434)
    this.modelEndpoint =
      process.env.OLLAMA_ENDPOINT || "http://cab_ollama:11434";
    this.modelName = "llama3.1"; // Model chuyên gia xử lý JSON & Reasoning
  }

  async scoreMultipleDrivers(drivers, featuresMap, driverDetailsMap) {
    // 1. Thu thập Context (Mô phỏng MCP)
    const driversData = drivers.map((driver) => {
      const features = featuresMap[driver.driverId] || {
        rating: 5.0,
        acceptanceRate: 0.9,
        avgResponseTime: 30,
        completedTrips: 0,
      };

      const details = driverDetailsMap[driver.driverId]?.data || {};

      return {
        driverId: driver.driverId,
        distanceKm: driver.distanceKm,
        rating: features.rating,
        acceptanceRate: features.acceptanceRate,
        vehicleType: details.vehicleType || "unknown",
      };
    });

    try {
      if (!this.aiAvailable)
        throw new Error("AI is currently disabled or unreachable");

      // 2. Tạo Prompt (Reasoning)
      const prompt = `
      You are an expert AI dispatcher for a cab booking system. 
      Your task is to score the following list of available drivers for a ride request.
      Score each driver from 0.0 to 1.0 based on:
      - Shortest distance (distanceKm) is preferred (highly weighted).
      - Higher rating is preferred.
      - Higher acceptance rate is preferred.

      Drivers Data:
      ${JSON.stringify(driversData, null, 2)}

      You MUST output ONLY a valid JSON array of objects, with no markdown, no code blocks, and no explanation.
      Format:
      [
        {
          "driverId": "string",
          "totalScore": 0.95
        }
      ]
      `;

      logger.info("🧠 Sending context to Ollama Agent...");

      // 3. Gọi AI Model qua Ollama API (Decision)
      const response = await axios.post(
        `${this.modelEndpoint}/api/generate`,
        {
          model: this.modelName,
          prompt: prompt,
          stream: false,
          format: "json", // Llama 3.1 support chuẩn JSON mode
        },
        { timeout: 15000 },
      );

      const jsonString = response.data.response;
      let parsedScores = [];
      try {
        parsedScores = JSON.parse(jsonString);
      } catch (e) {
        logger.error("Failed to parse Ollama output as JSON:", jsonString);
        throw new Error("Invalid AI response format");
      }

      // 4. Map kết quả AI trả về vào luồng hệ thống
      const scored = driversData.map((d) => {
        const aiScoreObj = parsedScores.find(
          (s) => String(s.driverId) === String(d.driverId),
        );
        return {
          driverId: d.driverId,
          distanceKm: d.distanceKm,
          rating: d.rating,
          acceptanceRate: d.acceptanceRate,
          totalScore: aiScoreObj ? parseFloat(aiScoreObj.totalScore) : 0,
          details: driverDetailsMap[d.driverId]?.data || {},
          aiUsed: true,
          aiReasoning: "Evaluated by Llama 3.1 Agent",
        };
      });

      // Sắp xếp từ điểm cao xuống thấp
      scored.sort((a, b) => b.totalScore - a.totalScore);
      return scored;
    } catch (error) {
      logger.warn(
        `⚠️ AI Agent failed (${error.message}), falling back to Rule-based algorithm...`,
      );
      return this.fallbackScoreMultipleDrivers(driversData, driverDetailsMap);
    }
  }

  // Fallback Service: Khi Ollama bị sập hoặc quá tải
  fallbackScoreMultipleDrivers(driversData, driverDetailsMap) {
    const scored = driversData.map((d) => {
      let score = scoringAlgorithm.calculateScore(
        d.distanceKm,
        d.rating,
        d.acceptanceRate,
        30,
        0,
      );

      // Bonus/Penalty cứng
      if (d.rating >= 4.8) score += 0.05;
      if (d.acceptanceRate >= 0.95) score += 0.03;
      if (d.distanceKm > 3) score -= 0.05;

      const finalScore = Math.min(1.0, Math.max(0, score));

      return {
        driverId: d.driverId,
        distanceKm: d.distanceKm,
        rating: d.rating,
        acceptanceRate: d.acceptanceRate,
        totalScore: finalScore,
        details: driverDetailsMap[d.driverId]?.data || {},
        aiUsed: false,
      };
    });

    scored.sort((a, b) => b.totalScore - a.totalScore);
    return scored;
  }

  async checkAIAvailability() {
    try {
      // Kiểm tra xem Ollama có đang chạy không
      const response = await axios.get(`${this.modelEndpoint}/api/tags`, {
        timeout: 2000,
      });
      this.aiAvailable = response.status === 200;
      return this.aiAvailable;
    } catch (error) {
      logger.warn(
        "Ollama health check failed, will use fallback:",
        error.message,
      );
      this.aiAvailable = false;
      return false;
    }
  }

  setAIAvailable(available) {
    this.aiAvailable = available;
  }
}

module.exports = new AIScoringService();
