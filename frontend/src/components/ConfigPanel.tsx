import { useState, useEffect } from "react";
import {
  getAvailableModels,
  getCurrentConfig,
  updateModelConfig,
  testConnection,
  getAvailableTTS,
  getCurrentTTSConfig,
  updateTTSConfig,
  testTTSConnection,
  type AvailableModelsResponse,
  type CurrentConfigResponse,
  type AvailableTTSResponse,
  type CurrentTTSConfigResponse,
} from "../api";

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "llm" | "tts";

export default function ConfigPanel({ isOpen, onClose }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("llm");

  // LLM State
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
  const [currentConfig, setCurrentConfig] =
    useState<CurrentConfigResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");

  // TTS State
  const [availableTTS, setAvailableTTS] = useState<AvailableTTSResponse | null>(
    null
  );
  const [currentTTSConfig, setCurrentTTSConfig] =
    useState<CurrentTTSConfigResponse | null>(null);
  const [selectedTTSProvider, setSelectedTTSProvider] = useState<string>("");
  const [selectedTTSModel, setSelectedTTSModel] = useState<string>("");
  const [selectedTTSVoice, setSelectedTTSVoice] = useState<string>("");
  const [ttsApiKey, setTTSApiKey] = useState<string>("");

  // Shared State
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [models, config, tts, ttsConfig] = await Promise.all([
        getAvailableModels(),
        getCurrentConfig(),
        getAvailableTTS(),
        getCurrentTTSConfig(),
      ]);

      setAvailableModels(models);
      setCurrentConfig(config);
      setSelectedProvider(config.provider);
      setSelectedModel(config.model);

      setAvailableTTS(tts);
      setCurrentTTSConfig(ttsConfig);
      setSelectedTTSProvider(ttsConfig.provider);
      setSelectedTTSModel(ttsConfig.model);
      setSelectedTTSVoice(ttsConfig.voice);
    } catch (error) {
      console.error("Failed to load configuration:", error);
      setMessage({
        type: "error",
        text: "Failed to load configuration data",
      });
    }
  };

  const handleSaveLLM = async () => {
    if (!selectedProvider || !selectedModel) {
      setMessage({
        type: "error",
        text: "Please select a provider and model",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await updateModelConfig({
        provider: selectedProvider,
        model: selectedModel,
        api_key: apiKey || undefined,
      });

      setCurrentConfig(response.config);
      setMessage({
        type: "success",
        text: response.message,
      });
      setApiKey(""); // Clear API key after successful save
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to update configuration",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTTS = async () => {
    if (!selectedTTSProvider || !selectedTTSModel || !selectedTTSVoice) {
      setMessage({
        type: "error",
        text: "Please select a provider, model, and voice",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await updateTTSConfig({
        provider: selectedTTSProvider,
        model: selectedTTSModel,
        voice: selectedTTSVoice,
        api_key: ttsApiKey || undefined,
      });

      setCurrentTTSConfig(response.config);
      setMessage({
        type: "success",
        text: response.message,
      });
      setTTSApiKey(""); // Clear API key after successful save
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to update TTS configuration",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestLLM = async () => {
    setTesting(true);
    setMessage(null);

    try {
      const response = await testConnection();
      setMessage({
        type: response.success ? "success" : "error",
        text: response.message,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to test connection",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestTTS = async () => {
    setTesting(true);
    setMessage(null);

    try {
      const response = await testTTSConnection();
      setMessage({
        type: response.success ? "success" : "error",
        text: response.message,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to test TTS connection",
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  const selectedProviderData = availableModels?.[selectedProvider];
  const models = selectedProviderData?.models || {};

  const selectedTTSProviderData = availableTTS?.[selectedTTSProvider];
  const ttsModels = selectedTTSProviderData?.models || {};
  const ttsVoices = selectedTTSProviderData?.voices || {};

  return (
    <div className="config-panel-overlay" onClick={onClose}>
      <div className="config-panel" onClick={(e) => e.stopPropagation()}>
        <div className="config-panel-header">
          <h2>AI Model Configuration</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="config-tabs">
          <button
            className={`config-tab ${activeTab === "llm" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("llm");
              setMessage(null);
            }}
          >
            🤖 Text Models
          </button>
          <button
            className={`config-tab ${activeTab === "tts" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("tts");
              setMessage(null);
            }}
          >
            🎙️ Voice (TTS)
          </button>
        </div>

        <div className="config-panel-body">
          {/* LLM Tab */}
          {activeTab === "llm" && (
            <>
              {/* Current Configuration Display */}
              {currentConfig && (
                <div className="current-config">
                  <div className="config-label">Current Configuration:</div>
                  <div className="config-value">
                    <strong>{currentConfig.provider}</strong> -{" "}
                    {currentConfig.model_info.name}
                  </div>
                  {!currentConfig.has_api_key && (
                    <div className="config-warning">
                      ⚠️ No API key configured for this provider
                    </div>
                  )}
                </div>
              )}

              {/* Provider Selection */}
              <div className="form-group">
                <label htmlFor="provider">Provider & Model:</label>
                <select
                  id="provider"
                  value={`${selectedProvider}:${selectedModel}`}
                  onChange={(e) => {
                    const [provider, model] = e.target.value.split(":");
                    setSelectedProvider(provider);
                    setSelectedModel(model);
                  }}
                  className="form-select"
                >
                  {availableModels &&
                    Object.entries(availableModels).map(([providerId, provider]) =>
                      Object.entries(provider.models).map(([modelId, modelInfo]) => (
                        <option
                          key={`${providerId}:${modelId}`}
                          value={`${providerId}:${modelId}`}
                        >
                          {provider.name} - {modelInfo.name} ({modelInfo.cost},{" "}
                          {modelInfo.speed})
                        </option>
                      ))
                    )}
                </select>
                {selectedProviderData && models[selectedModel] && (
                  <div className="model-description">
                    {models[selectedModel].description}
                  </div>
                )}
              </div>

              {/* API Key Input */}
              <div className="form-group">
                <label htmlFor="apiKey">
                  API Key
                  {selectedProviderData?.has_api_key &&
                    " (optional - using existing)"}
                  :
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    selectedProviderData?.has_api_key
                      ? "Leave empty to use existing key"
                      : "Enter your API key"
                  }
                  className="form-input"
                />
                <div className="api-key-hint">
                  Your API key is stored in memory and will be lost when the server
                  restarts
                </div>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`message message-${message.type}`}>
                  {message.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="config-panel-actions">
                <button
                  onClick={handleTestLLM}
                  disabled={testing || loading || !currentConfig?.has_api_key}
                  className="btn btn-secondary"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
                <button
                  onClick={handleSaveLLM}
                  disabled={loading || testing}
                  className="btn btn-primary"
                >
                  {loading ? "Saving..." : "Save & Apply"}
                </button>
              </div>
            </>
          )}

          {/* TTS Tab */}
          {activeTab === "tts" && (
            <>
              {/* Current TTS Configuration Display */}
              {currentTTSConfig && (
                <div className="current-config">
                  <div className="config-label">Current TTS Configuration:</div>
                  <div className="config-value">
                    <strong>{currentTTSConfig.provider_info.name}</strong> -{" "}
                    {currentTTSConfig.model} ({currentTTSConfig.voice})
                  </div>
                  {!currentTTSConfig.has_api_key && (
                    <div className="config-warning">
                      ⚠️ No API key configured for this provider
                    </div>
                  )}
                </div>
              )}

              {/* TTS Provider Selection */}
              <div className="form-group">
                <label htmlFor="ttsProvider">TTS Provider:</label>
                <select
                  id="ttsProvider"
                  value={selectedTTSProvider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    setSelectedTTSProvider(provider);
                    // Auto-select first model and voice
                    if (availableTTS?.[provider]) {
                      const firstModel = Object.keys(
                        availableTTS[provider].models
                      )[0];
                      const firstVoice = Object.keys(
                        availableTTS[provider].voices
                      )[0];
                      setSelectedTTSModel(firstModel);
                      setSelectedTTSVoice(firstVoice);
                    }
                  }}
                  className="form-select"
                >
                  {availableTTS &&
                    Object.entries(availableTTS).map(([providerId, provider]) => (
                      <option key={providerId} value={providerId}>
                        {provider.name} - {provider.cost}
                      </option>
                    ))}
                </select>
                {selectedTTSProviderData && (
                  <div className="model-description">
                    {selectedTTSProviderData.description}
                  </div>
                )}
              </div>

              {/* TTS Model Selection */}
              <div className="form-group">
                <label htmlFor="ttsModel">Model:</label>
                <select
                  id="ttsModel"
                  value={selectedTTSModel}
                  onChange={(e) => setSelectedTTSModel(e.target.value)}
                  className="form-select"
                >
                  {Object.entries(ttsModels).map(([modelId, modelInfo]) => (
                    <option key={modelId} value={modelId}>
                      {modelInfo.name} - {modelInfo.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* TTS Voice Selection */}
              <div className="form-group">
                <label htmlFor="ttsVoice">Voice:</label>
                <select
                  id="ttsVoice"
                  value={selectedTTSVoice}
                  onChange={(e) => setSelectedTTSVoice(e.target.value)}
                  className="form-select"
                >
                  {Object.entries(ttsVoices).map(([voiceId, voiceName]) => (
                    <option key={voiceId} value={voiceId}>
                      {voiceName}
                    </option>
                  ))}
                </select>
              </div>

              {/* TTS API Key Input */}
              <div className="form-group">
                <label htmlFor="ttsApiKey">
                  API Key
                  {selectedTTSProviderData?.has_api_key &&
                    " (optional - using existing)"}
                  :
                </label>
                <input
                  id="ttsApiKey"
                  type="password"
                  value={ttsApiKey}
                  onChange={(e) => setTTSApiKey(e.target.value)}
                  placeholder={
                    selectedTTSProviderData?.has_api_key
                      ? "Leave empty to use existing key"
                      : "Enter your API key"
                  }
                  className="form-input"
                />
                <div className="api-key-hint">
                  {selectedTTSProvider === "openai"
                    ? "Note: OpenAI TTS uses the same API key as the text model"
                    : "Your API key is stored in memory and will be lost when the server restarts"}
                </div>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`message message-${message.type}`}>
                  {message.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="config-panel-actions">
                <button
                  onClick={handleTestTTS}
                  disabled={testing || loading || !currentTTSConfig?.has_api_key}
                  className="btn btn-secondary"
                >
                  {testing ? "Testing..." : "Test Voice"}
                </button>
                <button
                  onClick={handleSaveTTS}
                  disabled={loading || testing}
                  className="btn btn-primary"
                >
                  {loading ? "Saving..." : "Save & Apply"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}