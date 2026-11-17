# Uso: python3 musica.py <segundos> '<toques en s>' <abanico en s> <salida.wav>. Música de fondo del vídeo, hecha aquí (sin muestras de nadie): acordes suaves, punteo de cuerda (Karplus-Strong),
# un bajo, un poco de ritmo y los toques de la pantalla. 44,1 kHz, estéreo.
import numpy as np, scipy.signal as ss, sys, json
from scipy.io import wavfile
SR=44100; DUR=float(sys.argv[1]); N=int(SR*DUR)+SR
rng=np.random.default_rng(7)
L=np.zeros(N); R=np.zeros(N)
BPM=96; beat=60/BPM; bar=4*beat
def hz(m): return 440*2**((m-69)/12)
# acordes (MIDI): Cmaj7, G/B add, Am7, Fmaj7 — dos compases cada uno
ACORDES=[[48,55,60,64,67,71],[47,55,59,62,67,74],[45,52,57,60,64,67],[41,53,57,60,64,69]]
def env(n,a,r,s=1.0):
    e=np.ones(n)*s; ai=int(a*SR); ri=int(r*SR)
    e[:ai]=np.linspace(0,s,ai) if ai else e[:ai]; 
    if ri: e[-ri:]=e[-ri:]*np.linspace(1,0,ri)
    return e
def add(sig,t0,pan=0.0,g=1.0):
    i=int(t0*SR); j=min(N,i+len(sig)); 
    if i>=N: return
    s=sig[:j-i]*g; L[i:j]+=s*np.sqrt((1-pan)/2); R[i:j]+=s*np.sqrt((1+pan)/2)
# pad: triángulos suaves algo desafinados, con filtro paso bajo
def pad(notas,dur):
    n=int(dur*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for m in notas[1:]:
        for d in (-.07,.07):
            f=hz(m+d*0); ph=2*np.pi*f*(1+d*.004)*t
            x+=ss.sawtooth(ph,.5)*.18
    b,a=ss.butter(2,1600/(SR/2)); x=ss.lfilter(b,a,x)
    return x*env(n,.9,1.2,1.0)
def pluck(m,dur=1.6,brillo=.996):
    f=hz(m); p=int(SR/f); n=int(dur*SR); buf=rng.uniform(-1,1,p); y=np.zeros(n)
    for i in range(n):
        y[i]=buf[i%p]; buf[i%p]=brillo*.5*(buf[i%p]+buf[(i+1)%p])
    b,a=ss.butter(2,3800/(SR/2)); return ss.lfilter(b,a,y)*env(n,.002,.4)
def bajo(m,dur):
    n=int(dur*SR); t=np.arange(n)/SR; x=np.sin(2*np.pi*hz(m)*t)+.25*np.sin(4*np.pi*hz(m)*t)
    return x*env(n,.01,.25)*np.exp(-t*1.6)
def tick(dur=.05,f=2400):
    n=int(dur*SR); t=np.arange(n)/SR; x=rng.uniform(-1,1,n)*np.exp(-t*90)*.6+np.sin(2*np.pi*f*t)*np.exp(-t*60)
    b,a=ss.butter(2,[1200/(SR/2),6000/(SR/2)],'band'); return ss.lfilter(b,a,x)
def shaker():
    n=int(.08*SR); t=np.arange(n)/SR; x=rng.uniform(-1,1,n)*np.exp(-t*55)
    b,a=ss.butter(2,7000/(SR/2),'high'); return ss.lfilter(b,a,x)
def kick():
    n=int(.35*SR); t=np.arange(n)/SR; f=55+60*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)
cache={}
t=0.0; k=0
while t<DUR+bar:
    ch=ACORDES[k%4]; d=2*bar
    add(pad(ch,d+1.2),t,0,.55)
    for b2 in range(8):   # dos compases
        tb=t+b2*beat
        add(bajo(ch[0]-12 if ch[0]>=45 else ch[0],beat*1.8),tb,0,.5 if b2%2==0 else 0)
        if t>=bar*2:     # el ritmo entra después de la presentación
            if b2%4==0: add(kick(),tb,0,.32)
            add(shaker(),tb+beat/2,.3,.10); add(shaker(),tb+beat*.75,-.3,.05)
        # punteo: la arpa sube por el acorde en corcheas
        if t>=bar:
            for c in range(2):
                m=ch[2+((b2*2+c)%4)]+12
                key=(m,)
                if key not in cache: cache[key]=pluck(m)
                add(cache[key],tb+c*beat/2,(-.35 if c else .35),.16)
    t+=d; k+=1
# los toques de la pantalla y el abanico de papeles
toques=json.loads(sys.argv[2]) if len(sys.argv)>2 else []
for tt in toques: add(tick(),tt,0,.55)
if len(sys.argv)>3:
    n=int(.7*SR); tw=np.arange(n)/SR; x=rng.uniform(-1,1,n)*np.sin(np.pi*tw/.7)**2
    b,a=ss.butter(2,[400/(SR/2),3000/(SR/2)],'band'); add(ss.lfilter(b,a,x),float(sys.argv[3]),0,.35)
# reverberación sencilla: respuesta de ruido que decae
ir_n=int(1.6*SR); ir=rng.uniform(-1,1,ir_n)*np.exp(-np.arange(ir_n)/SR*3.2); ir/=np.sqrt((ir**2).sum())
Lw=ss.fftconvolve(L,ir)[:N]; Rw=ss.fftconvolve(R,ir[::-1].copy())[:N]
L2=L*.82+Lw*.32; R2=R*.82+Rw*.32
# entra y sale suave; el final se apaga en 3 s
n=int(DUR*SR); L2=L2[:n]; R2=R2[:n]; f=np.ones(n); fi=int(1.2*SR); fo=int(3.0*SR); f[:fi]=np.linspace(0,1,fi); f[-fo:]=np.linspace(1,0,fo)
L2*=f; R2*=f; pk=max(np.abs(L2).max(),np.abs(R2).max()); g=.70/pk
out=np.stack([L2*g,R2*g],1)
wavfile.write(sys.argv[4] if len(sys.argv)>4 else 'musica.wav',SR,(out*32767).astype(np.int16)); print('ok', round(DUR,2),'s')
