import { YaplEditor } from "@/components/YaplEditor";
import { useEffect, useState } from "react";
import "./index.css";

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check for stored theme preference
    const storedTheme = localStorage.getItem("theme");
    if (
      storedTheme === "dark" ||
      (!storedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="container mx-auto p-8 relative z-10 w-full max-w-5xl">
      <div className="mb-8 px-8">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-3xl font-bold">YAPL Editor</h1>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/patrickjm/yapl"
              className="hover:text-primary p-2 rounded-lg hover:bg-accent"
              aria-label="GitHub Repository"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
            <button
              className="p-2 rounded-lg hover:bg-accent"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z"></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <div className="flex flex-row justify-between items-center pt-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold pb-2">What is YAPL?</h2>
            </div>
          </div>
          <p className="pb-2 block">
            YAPL (YAML Prompt Language) is like a simpler, declarative version
            of LangChain.
          </p>
          <p>
            It lets you prompt LLMs using YAML files with{" "}
            <a
              href="https://liquidjs.com/"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Liquid templating
            </a>
            .
          </p>
          <p className="mt-2">With YAPL, you can:</p>
          <ul className="list-none pl-4 mt-2">
            <li className="flex items-center gap-2 before:content-['•'] before:mr-2">
              Define message chains with system, user and assistant messages
            </li>
            <li className="flex items-center gap-2 before:content-['•'] before:mr-2">
              Use Liquid templates to inject dynamic content into prompts
            </li>
            <li className="flex items-center gap-2 before:content-['•'] before:mr-2">
              Enforce JSON output formats with{" "}
              <a
                href="https://www.npmjs.com/package/zod"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Zod schema validation
              </a>
            </li>
            <li className="flex items-center gap-2 before:content-['•'] before:mr-2">
              Configure different LLM providers and models
            </li>
            <li className="flex items-center gap-2 before:content-['•'] before:mr-2">
              Cache responses and handle retries automatically
            </li>
            <li className="flex items-center gap-2 before:content-['•'] before:mr-2">
              Create reusable prompt templates
            </li>
          </ul>
        </div>
      </div>

      <YaplEditor />
    </div>
  );
}

export default App;
