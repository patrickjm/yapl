import { useCallback, useEffect, useState } from "react";

export function useOpenRouterAuth(onApiKeyChange: (apiKey: string) => void) {
  const [apiKey, setApiKey] = useState<string>("");
  const [codeVerifier, setCodeVerifier] = useState<string>("");
  const [authInProgress, setAuthInProgress] = useState<boolean>(false);
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);
  const [lastAuthTimestamp, setLastAuthTimestamp] = useState<number | null>(null);

  // Generate code verifier on hook initialization or retrieve existing one
  useEffect(() => {
    const generateRandomString = (length: number) => {
      const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
      let text = "";
      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    };

    // Check if we have a stored code verifier
    const storedVerifier = sessionStorage.getItem("openrouterCodeVerifier");
    if (storedVerifier) {
      setCodeVerifier(storedVerifier);
    } else {
      // Generate a new one and store it
      const newVerifier = generateRandomString(64);
      sessionStorage.setItem("openrouterCodeVerifier", newVerifier);
      setCodeVerifier(newVerifier);
    }
    
    // Load previous auth data
    const storedKey = sessionStorage.getItem("openrouterApiKey");
    const storedAuthSuccess = sessionStorage.getItem("openrouterAuthSuccess");
    const storedAuthTimestamp = sessionStorage.getItem("openrouterAuthTimestamp");
    
    if (storedKey) {
      setApiKey(storedKey);
      onApiKeyChange(storedKey);
    }
    
    if (storedAuthSuccess === "true") {
      setAuthSuccess(true);
    }
    
    if (storedAuthTimestamp) {
      setLastAuthTimestamp(parseInt(storedAuthTimestamp, 10));
    }
  }, [onApiKeyChange]);

  // Check for OpenRouter auth code in URL on mount and verifier change
  useEffect(() => {
    if (!codeVerifier) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (code) {
      setAuthInProgress(true);
      
      // Exchange code for API key
      const exchangeCodeForKey = async () => {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code,
              code_verifier: codeVerifier,
              code_challenge_method: "S256",
            }),
          });
          
          if (response.ok) {
            const { key } = await response.json();
            setApiKey(key);
            onApiKeyChange(key);
            
            // Store auth data
            sessionStorage.setItem("openrouterApiKey", key);
            
            const timestamp = Date.now();
            sessionStorage.setItem("openrouterAuthSuccess", "true");
            sessionStorage.setItem("openrouterAuthTimestamp", timestamp.toString());
            
            setAuthSuccess(true);
            setLastAuthTimestamp(timestamp);
            
            // Remove code from URL to prevent reusing it
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.error("Failed to exchange code for key");
            sessionStorage.setItem("openrouterAuthSuccess", "false");
          }
        } catch (error) {
          console.error("Error exchanging code", error);
          sessionStorage.setItem("openrouterAuthSuccess", "false");
        } finally {
          setAuthInProgress(false);
        }
      };
      
      exchangeCodeForKey();
    }
  }, [codeVerifier, onApiKeyChange]);

  // Handle API key changes
  const handleApiKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    sessionStorage.setItem("openrouterApiKey", key);
    onApiKeyChange(key);
  }, [onApiKeyChange]);

  // Create SHA-256 code challenge for PKCE
  const createSHA256CodeChallenge = async (input: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hash = await crypto.subtle.digest("SHA-256", data);
    
    // Base64 URL encode the hash
    const hashArray = Array.from(new Uint8Array(hash));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
    return hashBase64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  };

  // Handle OpenRouter auth
  const handleOpenRouterAuth = useCallback(async () => {
    try {
      setAuthInProgress(true);
      
      // Make sure we have a code verifier in session storage
      if (!sessionStorage.getItem("openrouterCodeVerifier") && codeVerifier) {
        sessionStorage.setItem("openrouterCodeVerifier", codeVerifier);
      }
      
      const verifierToUse = sessionStorage.getItem("openrouterCodeVerifier") || codeVerifier;
      const codeChallenge = await createSHA256CodeChallenge(verifierToUse);
      const callbackUrl = window.location.origin + window.location.pathname;
      
      const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      
      // Create a form and submit it to navigate in the same tab
      // This prevents browsers like Arc from opening in a popup
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = 'https://openrouter.ai/auth';
      form.style.display = 'none';
      
      // Add the query parameters as hidden inputs
      const addHiddenInput = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };
      
      addHiddenInput('callback_url', callbackUrl);
      addHiddenInput('code_challenge', codeChallenge);
      addHiddenInput('code_challenge_method', 'S256');
      
      // Append the form to the body and submit it
      document.body.appendChild(form);
      form.submit();
      
      // We don't need to clean up the form as the page will navigate away
    } catch (error) {
      console.error("Error generating code challenge", error);
      setAuthInProgress(false);
    }
  }, [codeVerifier]);

  return {
    apiKey,
    authInProgress,
    authSuccess,
    lastAuthTimestamp,
    handleApiKeyChange,
    handleOpenRouterAuth
  };
} 