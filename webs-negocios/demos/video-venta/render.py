# Uso: python3 render.py <carpeta de trabajo> video|fotos|portada [escenas o i@t]. Dibuja el vídeo: cada escena, fotograma a fotograma (JPEG 92) a ffmpeg, un archivo por escena; luego se juntan.
import asyncio, json, subprocess, sys, os
from playwright.async_api import async_playwright
FPS=30; W=sys.argv[1]; OUT=os.path.join(W,'out')+'/'; os.makedirs(OUT, exist_ok=True)
CAJAS=json.load(open(os.path.join(W,'cap','cajas.json')))['cajas']
ESC=os.environ.get('ESCENARIO_URL','http://127.0.0.1:8791/escenario.html')
async def main():
    modo=sys.argv[2]
    async with async_playwright() as p:
        br=await p.chromium.launch()
        pg=await br.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
        await pg.add_init_script('window.CAJAS='+json.dumps(CAJAS))
        await pg.goto(ESC); await pg.evaluate('listo'); await pg.wait_for_timeout(300)
        D=await pg.evaluate('ESCENAS'); print('escenas', D, 'total', round(sum(D),1), 's')
        if modo=='portada':
            await pg.evaluate('portada(true)'); await pg.wait_for_timeout(400); await pg.screenshot(path=OUT+'portada-boton.jpg',type='jpeg',quality=90)
            await pg.reload(); await pg.evaluate('listo'); await pg.evaluate('portada(false)'); await pg.wait_for_timeout(400); await pg.screenshot(path=OUT+'portada.jpg',type='jpeg',quality=88)
        elif modo=='fotos':
            for par in sys.argv[3:]:
                i,t=par.split('@'); await pg.evaluate(f'dibuja({int(i)},{float(t)})')
                await pg.screenshot(path=f'{OUT}f{i}-{t}.jpg', type='jpeg', quality=88)
        else:
            sel=[int(x) for x in sys.argv[3:]] or range(len(D))
            for i in sel:
                n=round(D[i]*FPS); tmp=f'{OUT}esc{i:02d}.tmp.mp4'
                ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-',
                    '-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),'-f','mp4',tmp],stdin=subprocess.PIPE)
                for k in range(n):
                    await pg.evaluate(f'dibuja({i},{k/FPS})')
                    ff.stdin.write(await pg.screenshot(type='jpeg', quality=92))
                ff.stdin.close(); r=ff.wait()
                if r==0: os.replace(tmp, f'{OUT}esc{i:02d}.mp4'); print('escena', i, n, 'fotogramas')
                else: print('FALLA escena', i); sys.exit(1)
        await br.close()
asyncio.run(main())
