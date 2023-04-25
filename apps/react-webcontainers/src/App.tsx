import "./App.css";

function App() {
  return (
    <div className="container">
      <div className="editor">
        <textarea>I am a textarea</textarea>
      </div>
      <div className="preview">
        <iframe src="loading.html"></iframe>
      </div>
    </div>
  );
}

export default App;
