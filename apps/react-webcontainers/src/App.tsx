import { useCallback, useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { files } from "./tutorial-1/files";
import "./App.css";

function App() {
  const [container, setContainer] = useState<WebContainer | null>(null);

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
      console.log(packageJSON);
    })();
  }, [container]);

  return (
    <div className="container">
      <div className="editor">
        <textarea
          value="I am a textarea"
          onChange={() => {
            /**  */
          }}
        ></textarea>
      </div>
      <div className="preview">
        <iframe src="loading.html"></iframe>
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
