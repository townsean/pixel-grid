# Running Module Load / Syntax Checks (no Node)

This simple test loads your ES modules in the browser to reveal syntax or runtime import errors.

1. From the project root, start a simple static server (Python 3):

```bash
python -m http.server 8000
```

2. Open the checker in a browser:

http://localhost:8000/tests/syntax-check.html

3. The page will print `OK` or `ERROR` per module and any stack traces will appear in the browser console.

This avoids Node entirely and exercises module loading and worker import behavior in a real browser environment.
