"""Verify motion cadence, seam and texture independently of the largest jump."""
import numpy as np
import cv2
import subprocess
import json
from pathlib import Path
out=Path(__file__).resolve().parent
root=out.parents[3]
results=[]
for theme in ['dark','light']:
 path=root/f'public/images/hero/sunset-water-{theme}.mp4'
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','rawvideo','-pix_fmt','rgb24','-'])
 frames=np.frombuffer(raw,np.uint8).reshape(-1,130,1280,3).astype(np.float32)
 gray=frames.mean(axis=3)
 differences=np.mean(np.abs(np.diff(gray,axis=0)),axis=(1,2))
 seam=float(np.mean(np.abs(gray[-1]-gray[0])))
 # Use the ordinary first60frames, which exclude the tail overlap window.
 baseline=float(np.median(differences[:60]))
 energy=np.array([np.std(f-cv2.GaussianBlur(f,(0,0),8)) for f in gray])
 texture_baseline=float(np.median(energy[:60]))
 meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
 checks={'noStall':bool(differences.min()>.35*baseline),'noJump':bool(differences.max()<1.8*baseline),'seamContinuity':bool(seam<1.8*baseline),'textureRetained':bool(energy.min()>.90*texture_baseline),'textureStable':bool(energy.max()<1.12*texture_baseline),'videoOnly':len(meta['streams'])==1 and meta['streams'][0]['codec_type']=='video','frameCount':len(frames)==96}
 results.append({'theme':theme,'bytes':path.stat().st_size,'frames':len(frames),'seamMAE':seam,'baselineMedianMAE':baseline,'minAdjacentMAE':float(differences.min()),'maxAdjacentMAE':float(differences.max()),'minTextureRatio':float(energy.min()/texture_baseline),'maxTextureRatio':float(energy.max()/texture_baseline),'duration':meta['format']['duration'],'encoderVersion':meta['streams'][0].get('tags',{}).get('encoder'),'checks':checks})
(out/'encoded-verification.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
assert all(all(r['checks'].values()) for r in results)
