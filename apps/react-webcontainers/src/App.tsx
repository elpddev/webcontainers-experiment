import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { files } from "./tutorial-1/files";
import "xterm/css/xterm.css";
import "./App.css";

function App() {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [urlInfo, setUrlInfo] = useState<{
    url: string | undefined;
    num: number;
  }>({
    url: undefined,
    num: 0,
  });
  console.log("*** urlInfo ***", urlInfo);
  const serverUrl = useMemo(
    () => urlInfo.url && `${urlInfo.url}?${urlInfo.num}`,
    [urlInfo]
  );
  const [source, setSource] = useState(files["index.js"].file.contents);
  const [terminal, setTerminal] = useState<Terminal | null>(null);

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
      console.log("*** url ***", url);
      setUrlInfo(({ num }) => ({ url, num: num + 1 }));
    })();
  }, [container]);

  useEffect(() => {
    if (!terminal) return;
    if (!container) return;

    startShell(terminal, container);
  }, [terminal, container]);

  const onSourceChange = useEvent(() => {
    if (!container) return;
    writeIndexJS(container, source);
  });

  useEffect(() => {
    onSourceChange();
  }, [source, onSourceChange]);

  useEffect(() => {
    if (!container) return;
    container.on(WebContainerEventCode.ServerReady, (_port, url) => {
      setUrlInfo(({ num }) => ({ num: num + 1, url }));
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
        <iframe src={serverUrl}></iframe>
      </div>

      <MiniTerminal onChangeTerminal={setTerminal} />
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
  const [port, url] = (await promisifyOn(
    WebContainerEventCode.ServerReady,
    container
  )) as [number, string];

  return { port, url };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const promisifyOn = (event: string, target: any): Promise<any> => {
  return new Promise((resolve) => {
    target.on(event, (...args: unknown[]) => resolve(args));
  });
};

async function writeIndexJS(container: WebContainer, content: string) {
  await container.fs.writeFile("/index.js", content);
}

async function startShell(terminal: Terminal, container: WebContainer) {
  const shellProcess = await container.spawn("jsh", {
    terminal: {
      cols: terminal.cols,
      rows: terminal.rows,
    },
  });
  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  const input = shellProcess.input.getWriter();
  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
}

enum WebContainerEventCode {
  ServerReady = "server-ready",
}

function MiniTerminal({
  onChangeTerminal,
}: {
  onChangeTerminal?: (terminal: Terminal) => void;
}) {
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log("*** new terminal ***");
    if (!ref) return;

    const term = new Terminal({
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(ref);

    fitAddon.fit();

    setTerminal(term);

    return () => {
      console.log("*** closing terminal 1 ***");
      if (term) term.dispose();
    };
  }, [ref]);

  useEffect(() => {
    if (!terminal) return;
    onChangeTerminal?.(terminal);
  }, [terminal, onChangeTerminal]);

  return (
    <div
      ref={(ref) => {
        console.log("*** ref ***", ref);
        setRef(ref);
      }}
    ></div>
  );
}
