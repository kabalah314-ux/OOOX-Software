# Servidor de pruebas que SÍ da rangos (como ooox.es); el de python -m http.server no los da (como la vista previa).
import http.server, os, re, sys, socketserver
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def send_head(self):
        rng = self.headers.get('Range'); path = self.translate_path(self.path.split('?')[0])
        self._rng = None
        if rng and os.path.isfile(path):
            m = re.match(r'bytes=(\d*)-(\d*)', rng); size = os.path.getsize(path)
            a = int(m.group(1)) if m.group(1) else 0
            b = min(int(m.group(2)) if m.group(2) else size-1, size-1)
            f = open(path,'rb'); f.seek(a)
            self.send_response(206); self.send_header('Content-Type', self.guess_type(path)); self.send_header('Accept-Ranges','bytes')
            self.send_header('Content-Range', f'bytes {a}-{b}/{size}'); self.send_header('Content-Length', str(b-a+1)); self.end_headers()
            self._rng = (a,b); return f
        return super().send_head()
    def copyfile(self, src, dst):
        if self._rng:
            a,b = self._rng; dst.write(src.read(b-a+1))
        else: super().copyfile(src,dst)
os.chdir(sys.argv[1])
class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads=True
S(('127.0.0.1', int(sys.argv[2])), H).serve_forever()
