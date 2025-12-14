import { useState, useEffect } from "react";
import {
  getAvailableModels,
  getCurrentConfig,
  updateModelConfig,
  testConnection,
  type AvailableModelsResponse,
  type CurrentConfigResponse,
} from "../api";

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigPanel({ isOpen, onClose }: ConfigPanelProps) {
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
  const [currentConfig, setCurrentConfig] =
    useState<CurrentConfigResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
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
      const [models, config] = await Promise.all([
        getAvailableModels(),
        getCurrentConfig(),
      ]);
      setAvailableModels(models);
      setCurrentConfig(config);
      setSelectedProvider(config.provider);
      setSelectedModel(config.model);
    } catch (error) {
      console.error("Failed to load configuration:", error);
      setMessage({
        type: "error",
        text: "Failed to load configuration data",
      });
    }
  };

  const handleSave = async () => {
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

  const handleTest = async () => {
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

  if (!isOpen) return null;

  const selectedProviderData = availableModels?.[selectedProvider];
  const models = selectedProviderData?.models || {};

  return (
    <div className="config-panel-overlay" onClick={onClose}>
      <div className="config-panel" onClick={(e) => e.stopPropagation()}>
        <div className="config-panel-header">
          <h2>AI Model Configuration</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="config-panel-body">
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
              {selectedProviderData?.has_api_key && " (optional - using existing)"}
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
            <div className={`message message-${message.type}`}>{message.text}</div>
          )}

          {/* Action Buttons */}
          <div className="config-panel-actions">
            <button
              onClick={handleTest}
              disabled={testing || loading || !currentConfig?.has_api_key}
              className="btn btn-secondary"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={handleSave}
              disabled={loading || testing}
              className="btn btn-primary"
            >
              {loading ? "Saving..." : "Save & Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}