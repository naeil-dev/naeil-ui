"""Build a real-footage water loop; Python dependencies are isolated in /tmp.
Usage: python build-loop.py source.mov
No image/video generation API. Original assets are read-only.
"""
import sys, subprocess, json, hashlib, argparse
from pathlib import Path
import cv2
import numpy as np

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
parser=argparse.ArgumentParser()
parser.add_argument('source',type=Path)
parser.add_argument('--crf',type=int,default=18)
args=parser.parse_args()
SOURCE=args.source
OUT=ROOT/'public/images/hero'
# FFmpeg applies the source's rotation/crop metadata before scaling.
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(SOURCE),'-an','-vf','scale=1308:1744','-pix_fmt','rgb24','-f','rawvideo','-'])
frames=np.frombuffer(raw,np.uint8).reshape(-1,1744,1308,3)
original_count=len(frames)
# Exclude the duplicate and additional movement in the last nine source frames.
# The retained first48frames also contain camera motion, corrected below.
frames=frames[:48]
ref=cv2.cvtColor(cv2.resize(frames[0],(654,872)),cv2.COLOR_RGB2GRAY)
mask=np.zeros_like(ref);mask[450:600,25:629]=255
points=cv2.goodFeaturesToTrack(ref,200,.015,8,mask=mask)
water=[];transforms=[]
for frame in frames:
 gray=cv2.cvtColor(cv2.resize(frame,(654,872)),cv2.COLOR_RGB2GRAY)
 tracked,status,_=cv2.calcOpticalFlowPyrLK(ref,gray,points,None,winSize=(31,31),maxLevel=4)
 good=status.ravel()==1
 matrix,inliers=cv2.estimateAffinePartial2D(points[good],tracked[good],method=cv2.RANSAC,ransacReprojThreshold=1.5)
 if matrix is None or int(inliers.sum())<12:raise RuntimeError('Insufficient fixed-land stabilization features')
 transforms.append({'matrix':matrix.tolist(),'inliers':int(inliers.sum())})
 matrix[:,2]*=2
 stabilized=cv2.warpAffine(frame,matrix,(1308,1744),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REFLECT_101)
 # Far/mid water only; discard shoreline and foreground concrete blocks.
 crop=stabilized[1220:1570,10:1298]
 water.append(cv2.resize(crop,(1280,130),interpolation=cv2.INTER_AREA).astype(np.float32))
water=np.stack(water)
# Remove slowly varying source illumination, preserve photographed moving ripples.
mean=water.mean(axis=0)
source_low=cv2.GaussianBlur(mean,(0,0),16)
# Find the best matching six-frame overlap within the stable source window.
# High-pass comparison prioritizes ripple shape over broad illumination.
overlap=6
high=np.stack([f-cv2.GaussianBlur(f,(0,0),8) for f in water])
candidates=[]
for start in range(4):
 for end in range(44,49):
  score=float(np.mean((high[end-overlap:end]-high[start:start+overlap])**2))
  candidates.append({'start':start,'end':end,'score':score})
best=min(candidates,key=lambda x:x['score'])
water=water[best['start']:best['end']]

def blend(a,b,w):
 """Preserve ripple variance during overlap; low-frequency color stays linear."""
 low_a=cv2.GaussianBlur(a,(0,0),8);low_b=cv2.GaussianBlur(b,(0,0),8)
 hi_a=a-low_a;hi_b=b-low_b
 hi=(1-w)*hi_a+w*hi_b
 desired=(1-w)*np.std(hi_a)+w*np.std(hi_b)
 # Actual measured covariance also handles partially correlated ripples.
 gain=desired/max(float(np.std(hi)),1e-6)
 return (1-w)*low_a+w*low_b+hi*gain

cycle=[]
for i in range(overlap,len(water)):
 a=water[i]
 if i>=len(water)-overlap:
  j=i-(len(water)-overlap)
  t=(j+1)/(overlap+1);w=(1-np.cos(np.pi*t))/2
  a=blend(a,water[j],w)
 cycle.append(a)
cycle=np.stack(cycle)
# Keep the approved3.2-second duration; interpolate the selected stable window.
loop=[]
for i in range(96):
 t=i*len(cycle)/96;k=int(t);f=t-k
 loop.append(blend(cycle[k],cycle[(k+1)%len(cycle)],f))
loop=np.stack(loop)
report={'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'sourceFrames':original_count,'stableSourceFrames':48,'selectedWindow':best,'overlapFrames':overlap,'fps':30,'outputFrames':len(loop),'duration':len(loop)/30,'crop':[10,1220,1288,350],'versions':{'python':sys.version.split()[0],'numpy':np.__version__,'opencv':cv2.__version__,'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]},'encoder':{'codec':'libx264','crf':args.crf,'preset':'slow'},'stabilization':transforms,'assets':[]}
for theme,image_name in [('dark','sunset-a.webp'),('light','sunset-a-light.webp')]:
 image=cv2.cvtColor(cv2.imread(str(OUT/image_name)),cv2.COLOR_BGR2RGB)
 target=cv2.resize(image[772:941],(1280,130),interpolation=cv2.INTER_AREA).astype(np.float32)
 target_low=cv2.GaussianBlur(target,(0,0),16)
 # Preserve the approved image's low-frequency color/reflection, replace water
 # texture with the stabilized original footage. This is a composite, not an
 # assertion that the AI-expanded island geometry was filmed by the camera.
 texture_gain=.80 if theme=='light' else .60
 colored=np.clip(target_low[None]+(loop-source_low[None])*texture_gain,0,255).astype(np.uint8)
 output=OUT/f'sunset-water-{theme}.mp4'
 proc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1280x130','-framerate','30','-i','-','-an','-c:v','libx264','-preset','slow','-crf',str(args.crf),'-tune','grain','-x264-params','ipratio=1:pbratio=1:aq-mode=0:mbtree=0','-pix_fmt','yuv420p','-movflags','+faststart','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',str(output)],stdin=subprocess.PIPE)
 proc.communicate(colored.tobytes())
 if proc.returncode:raise RuntimeError('Encoder failed')
 # Review artifact: complete approved composition with the same feather as CSS.
 preview=HERE/f'preview-{theme}.mp4'
 base=cv2.resize(image,(1280,720),interpolation=cv2.INTER_AREA)
 alpha=np.clip(np.arange(130,dtype=np.float32)/20,0,1)[:,None,None]
 proc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1280x720','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(preview)],stdin=subprocess.PIPE)
 for frame in colored:
  full=base.copy();full[590:]=np.clip(full[590:]*(1-alpha)+frame*alpha,0,255).astype(np.uint8);proc.stdin.write(full.tobytes())
 proc.stdin.close();proc.wait()
 cv2.imwrite(str(HERE/f'composite-{theme}.jpg'),cv2.cvtColor(full,cv2.COLOR_RGB2BGR))
 diffs=np.mean(np.abs(np.diff(colored.astype(float),axis=0)),axis=(1,2,3))
 report['assets'].append({'theme':theme,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'meanAdjacentDifference':float(diffs.mean()),'maxAdjacentDifference':float(diffs.max()),'seamDifference':float(np.abs(colored[-1].astype(float)-colored[0]).mean())})
(HERE/'build-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='stabilization'},indent=2))
