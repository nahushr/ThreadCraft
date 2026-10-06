import { useEffect, useId, useMemo, useState } from "react";
import type { JSX } from "react";
import type {
  ThreadCraftChatModel,
  ThreadCraftChatProviderOption,
  ThreadCraftLoadChatModelsRequest,
} from "../types";
import styles from "./ChatProviderControls.module.scss";

interface ChatProviderControlsProps {
  providers: ThreadCraftChatProviderOption[];
  showApiKeyInput: boolean;
  selectedProvider?: string;
  selectedModel?: string;
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
  onApiKeyChange?: (provider: string, apiKey: string) => void;
  onLoadModels?: (request: ThreadCraftLoadChatModelsRequest) => Promise<ThreadCraftChatModel[]>;
}

const getModelsKey = (models: ThreadCraftChatModel[]): string =>
  models.map((model) => model.id).join("\u0000");

const ChatProviderControls = ({
  providers,
  showApiKeyInput,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onLoadModels,
}: ChatProviderControlsProps): JSX.Element | null => {
  const providerLabelId = useId();
  const modelLabelId = useId();
  const keyLabelId = useId();
  const providerIds = useMemo(() => providers.map((provider) => provider.id), [providers]);
  const providerIdsKey = providerIds.join("\u0000");
  const providerKeysKey = JSON.stringify(providers.map(({ id, apiKey }) => [id, apiKey ?? ""]));
  const [localProvider, setLocalProvider] = useState(selectedProvider ?? providers[0]?.id ?? "");
  const [localModel, setLocalModel] = useState(selectedModel ?? "");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => Object.fromEntries(
    providers.map(({ id, apiKey }) => [id, apiKey ?? ""]),
  ));
  const [loadedModels, setLoadedModels] = useState<Record<string, ThreadCraftChatModel[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeProviderId = providerIds.includes(selectedProvider ?? localProvider)
    ? selectedProvider ?? localProvider
    : providers[0]?.id ?? "";
  const activeProvider = providers.find(({ id }) => id === activeProviderId);
  const models = loadedModels[activeProviderId] ?? activeProvider?.models ?? [];
  const activeModelId = models.some(({ id }) => id === (selectedModel ?? localModel))
    ? selectedModel ?? localModel
    : models[0]?.id ?? "";
  const activeApiKey = apiKeys[activeProviderId] ?? activeProvider?.apiKey ?? "";

  useEffect(() => {
    setApiKeys((current) => {
      let changed = false;
      const next = { ...current };
      for (const provider of providers) {
        if (provider.apiKey !== undefined && next[provider.id] !== provider.apiKey) {
          next[provider.id] = provider.apiKey;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [providers, providerKeysKey]);

  useEffect(() => {
    if (providerIds.length === 0) return;
    const nextProvider = providerIds.includes(selectedProvider ?? localProvider)
      ? selectedProvider ?? localProvider
      : providerIds[0];
    if (selectedProvider === undefined) setLocalProvider(nextProvider);
    const nextModels = loadedModels[nextProvider]
      ?? providers.find(({ id }) => id === nextProvider)?.models
      ?? [];
    const currentModel = selectedModel ?? localModel;
    const nextModel = nextModels.some(({ id }) => id === currentModel)
      ? currentModel
      : nextModels[0]?.id ?? "";
    if (selectedModel === undefined) setLocalModel(nextModel);
    if (selectedModel !== nextModel || selectedModel === undefined && localModel !== nextModel) {
      onModelChange?.(nextModel);
    }
  }, [
    activeProviderId,
    getModelsKey(models),
    loadedModels,
    localModel,
    localProvider,
    onModelChange,
    providerIds,
    providerIdsKey,
    providers,
    selectedModel,
    selectedProvider,
  ]);

  if (providers.length === 0 || !activeProvider) return null;

  const handleProviderChange = (nextProvider: string): void => {
    setLocalProvider(nextProvider);
    setError("");
    setMessage("");
    onProviderChange?.(nextProvider);
    const nextModels = loadedModels[nextProvider]
      ?? providers.find(({ id }) => id === nextProvider)?.models
      ?? [];
    const nextModel = nextModels[0]?.id ?? "";
    if (selectedModel === undefined) setLocalModel(nextModel);
    onModelChange?.(nextModel);
  };

  const handleModelChange = (nextModel: string): void => {
    setLocalModel(nextModel);
    onModelChange?.(nextModel);
  };

  const handleApiKeyChange = (nextKey: string): void => {
    setApiKeys((current) => ({ ...current, [activeProviderId]: nextKey }));
    setError("");
    setMessage("");
    setLoadedModels((current) => {
      const next = { ...current };
      delete next[activeProviderId];
      return next;
    });
    if (selectedModel === undefined) setLocalModel("");
    onModelChange?.("");
    onApiKeyChange?.(activeProviderId, nextKey);
  };

  const handleLoadModels = async (): Promise<void> => {
    if (!onLoadModels || isLoading) return;
    setIsLoading(true);
    setError("");
    setMessage("");
    try {
      const request: ThreadCraftLoadChatModelsRequest = {
        provider: activeProviderId,
        apiKey: activeApiKey.trim() || undefined,
      };
      const nextModels = await onLoadModels(request);
      setLoadedModels((current) => ({ ...current, [activeProviderId]: nextModels }));
      const nextModel = nextModels.some(({ id }) => id === (selectedModel ?? localModel))
        ? selectedModel ?? localModel
        : nextModels[0]?.id ?? "";
      if (selectedModel === undefined) setLocalModel(nextModel);
      onModelChange?.(nextModel);
      setMessage(nextModels.length > 0 ? `${nextModels.length} models available.` : "No chat models are available for this key.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load models. Check the provider and key.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section aria-label="Chat provider settings" className={styles.controls}>
      <div className={styles.selectionRow}>
        <label className={styles.field}>
          <span id={providerLabelId}>Provider</span>
          <select
            aria-labelledby={providerLabelId}
            disabled={isLoading}
            value={activeProviderId}
            onChange={(event) => handleProviderChange(event.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.label}</option>
            ))}
          </select>
        </label>
      </div>

      {showApiKeyInput && (
        <div className={styles.keyRow}>
          <label className={`${styles.field} ${styles.keyField}`}>
            <span id={keyLabelId}>{activeProvider.label} API key</span>
            <input
              aria-labelledby={keyLabelId}
              autoComplete="off"
              name={`threadcraft-${activeProviderId}-api-key`}
              placeholder={`Enter ${activeProvider.label} API key`}
              spellCheck={false}
              type="password"
              value={activeApiKey}
              disabled={isLoading}
              onChange={(event) => handleApiKeyChange(event.target.value)}
            />
          </label>
          {onLoadModels && (
            <button
              className={styles.loadButton}
              disabled={isLoading || !activeApiKey.trim()}
              type="button"
              onClick={() => void handleLoadModels()}
            >
              {isLoading ? "Loading…" : "Load models"}
            </button>
          )}
        </div>
      )}

      {!showApiKeyInput && onLoadModels && (
        <div className={styles.hiddenKeyActions}>
          <button
            className={styles.loadButton}
            disabled={isLoading}
            type="button"
            onClick={() => void handleLoadModels()}
          >
            {isLoading ? "Loading…" : "Refresh models"}
          </button>
        </div>
      )}

      <label className={styles.field}>
        <span id={modelLabelId}>Model</span>
        <select
          aria-labelledby={modelLabelId}
          disabled={models.length === 0 || isLoading}
          value={activeModelId}
          onChange={(event) => handleModelChange(event.target.value)}
        >
          {models.length === 0
            ? <option value="">Load models to choose</option>
            : models.map((model) => (
              <option key={model.id} value={model.id}>{model.label ?? model.id}</option>
            ))}
        </select>
      </label>

      {(error || message) && (
        <p className={error ? styles.error : styles.status} role={error ? "alert" : "status"}>
          {error || message}
        </p>
      )}
    </section>
  );
};

export default ChatProviderControls;
