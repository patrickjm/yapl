import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ExternalLink, Key, Lock } from "lucide-react";
import { useOpenRouterAuth } from "./useOpenRouterAuth";

interface OpenRouterAuthProps {
  onApiKeyChange: (apiKey: string) => void;
}

export function OpenRouterAuth({ onApiKeyChange }: OpenRouterAuthProps) {
  const {
    apiKey,
    authInProgress,
    authSuccess,
    lastAuthTimestamp,
    handleApiKeyChange,
    handleOpenRouterAuth,
  } = useOpenRouterAuth(onApiKeyChange);

  const formattedAuthTime = lastAuthTimestamp
    ? new Date(lastAuthTimestamp).toLocaleTimeString()
    : null;

  return (
    <div className="space-y-4">
      {apiKey ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              OpenRouter API Key
            </label>
            {authSuccess && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              className="pr-10"
              readOnly
            />
            <Key className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              <Lock className="inline h-3 w-3 mr-1" />
              Your API key is securely stored in local storage.
            </p>
            {authSuccess && formattedAuthTime && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Successfully authenticated at {formattedAuthTime}
              </p>
            )}
            <Button
              onClick={handleOpenRouterAuth}
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={authInProgress}
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              {authInProgress ? "Redirecting..." : "Connect Again"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={handleOpenRouterAuth}
            className="w-full"
            variant="outline"
            disabled={authInProgress}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {authInProgress ? "Redirecting..." : "Connect with OpenRouter"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {authInProgress
              ? "You'll be redirected to OpenRouter for authentication..."
              : "Securely connect using OpenRouter's OAuth"}
          </p>
          {authInProgress && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1">
              Please wait while we redirect you. You'll return to this page
              after authentication.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
