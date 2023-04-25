import { useCallback, useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { files } from "./tutorial-1/files";
import "./App.css";

function App() {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [url, setUrl] = useState<string | undefined>(undefined);

  const onLoad = useEvent(async () => {
    const containerTemp = await WebContainer.boot();
    setContainer(containerTemp);
  });

  useEffect(() => {
    window.addEventListener("load", onLoad);
  }, [onLoad]);

  useEffect(() => {
    if (!container) return;

    (async () => {
      await container.mount(files);
      const packageJSON = await container.fs.readFile("package.json", "utf-8");

      const exitCode = await installDependencies(container);
      if (exitCode !== 0) {
        throw new Error("Installation failed");
      }

      const { url } = await startDevServer(container);
      setUrl(url);
    })();
  }, [container]);

  return (
    <div className="container">
      <div className="editor">
        <textarea
          value={files["index.js"].file.contents}
          onChange={() => {
            /**  */
          }}
        ></textarea>
      </div>
      <div className="preview">
        <iframe src={url}></iframe>
      </div>
    </div>
  );
}

export default App;

const useEvent = (callback: () => void) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  return useCallback(() => callbackRef.current(), []);
};

async function installDependencies(container: WebContainer) {
  // Install dependencies
  const installProcess = await container.spawn("npm", ["install"]);

  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        console.log(data);
      },
    })
  );

  // Wait for install command to exit
  return installProcess.exit;
}

async function startDevServer(container: WebContainer) {
  // Run `npm run start` to start the Express app
  await container.spawn("npm", ["run", "start"]);

  // Wait for `server-ready` event
  const [port, url] = await promisifyOn<[string, string]>(
    "server-ready",
    container
  );

  return { port, url };
}

const promisifyOn = (event: string, target: any) => {
  return new Promise((resolve) => {
    target.on(event, (...args: any[]) => resolve(args));
  });
};
