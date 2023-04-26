import { useCallback, useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { files } from "./tutorial-1/files";
import "./App.css";

function App() {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [urlRefresh, setUrlRefresh] = useState(0);
  const [source, setSource] = useState(files["index.js"].file.contents);

  const onLoad = useEvent(async () => {
    if (container) return;
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

      await installDependencies(container);

      const { url } = await startDevServer(container);
      setUrl(url);
      setUrlRefresh((prev) => prev + 1);
    })();
  }, [container]);

  const onSourceChange = useEvent(() => {
    if (!container) return;
    writeIndexJS(container, source);
  });

  useEffect(() => {
    onSourceChange();
  }, [source, onSourceChange]);

  useEffect(() => {
    if (!container) return;
    container.on(WebContainerEventCode.ServerReady, (port, url) => {
      setUrl(url);
      setUrlRefresh((prev) => prev + 1);
    });
  }, [container]);

  return (
    <div className="container">
      <div className="editor">
        <textarea
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
          }}
        ></textarea>
      </div>
      <div className="preview">
        <div>
          {urlRefresh} - {url}
        </div>
        <iframe key={urlRefresh} src={url}></iframe>
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

  if ((await installProcess.exit) !== 0) {
    throw new Error("Installation failed");
  }
}

async function startDevServer(container: WebContainer) {
  // Run `npm run start` to start the Express app
  const startProcess = await container.spawn("npm", ["run", "start"]);

  startProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        console.log(data);
      },
    })
  );

  // Wait for `server-ready` event
  const [port, url] = await promisifyOn(
    WebContainerEventCode.ServerReady,
    container
  );

  return { port, url };
}

const promisifyOn = (event: string, target: any) => {
  return new Promise((resolve) => {
    target.on(event, (...args: any[]) => resolve(args));
  });
};

async function writeIndexJS(container: WebContainer, content: string) {
  console.log("** source changed **", content);
  await container.fs.writeFile("/index.js", content);
}

enum WebContainerEventCode {
  ServerReady = "server-ready",
}
