import { useState, useMemo, useEffect } from 'react'
import './App.css'
import { Editor } from '@monaco-editor/react'
import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'
import { MonacoBinding } from 'y-monaco'

function App() {
  const [editor, setEditor] = useState(null)
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('connecting')

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText('monaco'), [ydoc])

  const handleMount = (editorInstance) => {
    setEditor(editorInstance)
  }

  const handleJoin = (e) => {
    e.preventDefault()
    const name = e.target.username.value.trim()
    if (name) {
      setUsername(name)
      window.history.pushState({}, "", "?username=" + encodeURIComponent(name))
    }
  }

  useEffect(() => {
    if (!username || !editor) return

    const provider = new SocketIOProvider("http://localhost:3000", "monaco", ydoc, {
      autoConnect: true,
    })

    provider.on('status', (event) => {
      setStatus(event.status)
    })

    provider.awareness.setLocalStateField("user", { username })

    const updateAwareness = () => {
      const states = Array.from(provider.awareness.getStates().values())
      const activeUsers = states
        .map(state => state.user)
        .filter(user => user && user.username)
      setUsers(activeUsers)
    }

    provider.awareness.on("change", updateAwareness)

    function handleBeforeUnload() {
      provider.awareness.setLocalStateField('user', null)
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    const monacoBinding = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    )

    return () => {
      monacoBinding.destroy()
      provider.awareness.off("change", updateAwareness)
      provider.disconnect()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [username, editor, ydoc, yText])

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex items-center justify-center p-4">
        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4 bg-slate-900 border border-slate-800 p-8 rounded-xl w-full max-w-md shadow-2xl"
        >
          <h1 className="text-2xl font-bold text-amber-400 text-center mb-2">
            Join Dev Workspace
          </h1>
          <p className="text-sm text-gray-400 text-center mb-2">
            Enter your name to start real-time collaborative coding
          </p>
          <input
            type="text"
            placeholder="Enter your username"
            className="p-3 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:border-amber-400 transition"
            name="username"
            required
            autoFocus
          />
          <button
            type="submit"
            className="p-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold transition shadow-lg"
          >
            Join Session
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-2">
      <aside className="w-1/4 h-full bg-slate-900 border border-slate-800 text-white p-4 rounded-lg overflow-hidden flex flex-col justify-between">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-amber-400">Dev Workspace</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">User:</span>
            <span className="text-sm font-semibold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {username}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Connection:</span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded ${status === 'connected' ? 'bg-green-900 text-green-300' : 'bg-amber-900 text-amber-300'
                }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-400">Room: monaco</p>
          {users.length > 0 && (
            <div className="mt-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Active Users ({users.length})
              </h3>
              <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {users.map((u, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-center gap-2 bg-slate-800/60 px-2 py-1 rounded">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    {u.username}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
      <section className="w-3/4 h-full bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Collaborative Monaco Editor initialized"
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>
    </main>
  )
}

export default App
