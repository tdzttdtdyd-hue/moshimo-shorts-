#!/usr/bin/env bash
# 効果音を FFmpeg だけで合成する（外部素材なし・ライセンスフリー）
set -euo pipefail
cd "$(dirname "$0")/../public/sfx"
F="ffmpeg -loglevel error -y"
$F -f lavfi -i "anoisesrc=d=0.7:c=pink:a=0.9" -af "bandpass=f=900:width_type=o:w=2,afade=t=in:d=0.25,afade=t=out:st=0.3:d=0.4,aformat=sample_rates=48000:channel_layouts=stereo" whoosh.wav
$F -f lavfi -i "aevalsrc='0.9*sin(2*PI*(500*t+4000*t*t))*exp(-t*30)':d=0.15:s=48000" -af "aformat=channel_layouts=stereo" pop.wav
$F -f lavfi -i "aevalsrc='0.9*sin(2*PI*(70-30*t)*t)*exp(-t*4)':d=0.9:s=48000" -f lavfi -i "anoisesrc=d=0.9:c=brown:a=0.8" -filter_complex "[1]lowpass=f=300,afade=t=out:st=0:d=0.6[n];[0][n]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo" boom.wav
$F -f lavfi -i "aevalsrc='0.5*sin(2*PI*1320*t)*exp(-t*6)+0.35*sin(2*PI*1980*t)*exp(-t*8)':d=0.7:s=48000" -af "aformat=channel_layouts=stereo" ding.wav
$F -f lavfi -i "anoisesrc=d=2.5:c=pink:a=0.9" -af "highpass=f=200,lowpass=f=2500,tremolo=f=5:d=0.4,afade=t=in:d=0.3,afade=t=out:st=1.7:d=0.8,aformat=sample_rates=48000:channel_layouts=stereo" wind.wav
$F -f lavfi -i "anoisesrc=d=4:c=brown:a=0.9" -af "lowpass=f=180,tremolo=f=3:d=0.5,afade=t=in:d=1.5,afade=t=out:st=3.2:d=0.8,aformat=sample_rates=48000:channel_layouts=stereo" rumble.wav
# 早送りの「シュイーン」
$F -f lavfi -i "aevalsrc='0.5*sin(2*PI*(220*t+700*t*t))*min(1,t*8)*exp(-max(0,t-0.5)*8)':d=0.8:s=48000" -f lavfi -i "anoisesrc=d=0.8:c=pink:a=0.6" -filter_complex "[1]highpass=f=800,afade=t=in:d=0.5,afade=t=out:st=0.55:d=0.25[n];[0][n]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo" ff.wav
# バレー用：スパイクの打球音・主審の笛・ガラスの割れる音
$F -f lavfi -i "aevalsrc='0.9*sin(2*PI*(160-80*t)*t)*exp(-t*28)':d=0.25:s=48000" -f lavfi -i "anoisesrc=d=0.25:c=white:a=0.9" -filter_complex "[1]bandpass=f=2200:width_type=o:w=2,afade=t=out:st=0:d=0.08[n];[0][n]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo" hit.wav
$F -f lavfi -i "aevalsrc='0.6*sin(2*PI*2900*t+3*sin(2*PI*28*t))*min(1\,t*40)*if(lt(t\,0.55)\,1\,exp(-(t-0.55)*30))':d=0.7:s=48000" -af "aformat=channel_layouts=stereo" whistle.wav
$F -f lavfi -i "anoisesrc=d=1.2:c=white:a=0.9" -af "highpass=f=2500,apulsator=hz=18:amount=0.8,afade=t=out:st=0.05:d=1.1,aformat=sample_rates=48000:channel_layouts=stereo" glass.wav
# 1円玉：チャリン（単発）
$F -f lavfi -i "aevalsrc='0.5*sin(2*PI*3520*t)*exp(-t*18)+0.35*sin(2*PI*5230*t)*exp(-t*26)+0.2*sin(2*PI*7900*t)*exp(-t*40)':d=0.4:s=48000" -af "aformat=channel_layouts=stereo" coin.wav
# 1円玉がジャラジャラ（coins.wav）は numpy で合成：scripts/make-coins-sfx.py
python3 ../../scripts/make-coins-sfx.py coins.wav
# 氷が割れる・凍る音
$F -f lavfi -i "anoisesrc=d=0.9:c=white:a=0.9" -af "highpass=f=1200,lowpass=f=7000,apulsator=hz=9:amount=0.9,afade=t=out:st=0.05:d=0.85,aformat=sample_rates=48000:channel_layouts=stereo" ice.wav
# ピークを -6dBFS に正規化
for f in *.wav; do
  m=$(ffmpeg -i "$f" -af volumedetect -f null - 2>&1 | awk '/max_volume/{print $5}')
  g=$(python3 -c "print(-6-($m))")
  $F -i "$f" -af "volume=${g}dB" tmp.wav && mv tmp.wav "$f"
done
