# Servidor de pruebas que se puede poner lento: sirve una carpeta y, tras pedir /__lento?ms=6000, tarda esos milisegundos en
# contestar a todo lo demás (como una raya de cobertura que ni contesta ni falla). /__lento?ms=0 lo vuelve a poner normal.
# Uso: python3 servidor_lento.py <carpeta> <puerto>
import http.server, os, re, sys, socketserver, time
RETRASO = [0]
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        m = re.match(r'/__lento\?ms=(\d+)$', self.path)
        if m:
            RETRASO[0] = int(m.group(1)); self.send_response(200); self.send_header('Content-Length', '2'); self.end_headers(); self.wfile.write(b'ok'); return
        if RETRASO[0]: time.sleep(RETRASO[0] / 1000)
        try: super().do_GET()
        except (BrokenPipeError, ConnectionResetError): pass
os.chdir(sys.argv[1])
class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True
S(('127.0.0.1', int(sys.argv[2])), H).serve_forever()
