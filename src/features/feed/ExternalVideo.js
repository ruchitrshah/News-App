// Embedded YouTube player (native). Existing authoritative video is embedded,
// never downloaded or re-hosted. Mounted only while the story is on screen so
// at most one player runs. YouTube's chrome is off; PlayerControls gives
// tap-to-play/pause and fullscreen. Fullscreen reopens the clip in a modal
// at the current time (iPhone has no element-fullscreen for iframes).
// A baseUrl gives the page a real origin, which YouTube requires.
import React, { useRef, useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PlayerControls from './PlayerControls';

export function embedUrl({ video_id, start_time, end_time }) {
  const p = new URLSearchParams({ autoplay: '1', playsinline: '1', controls: '0', rel: '0', modestbranding: '1', iv_load_policy: '3' });
  if (start_time != null) p.set('start', String(Math.floor(start_time)));
  if (end_time != null) p.set('end', String(Math.ceil(end_time)));
  return `https://www.youtube.com/embed/${video_id}?${p}`;
}

const page = ({ video_id, end_time }, start) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p{position:absolute;inset:0;width:100%;height:100%}</style>
</head><body><div id="p"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
var player;
function post(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}
function onYouTubeIframeAPIReady(){
  player=new YT.Player('p',{width:'100%',height:'100%',videoId:${JSON.stringify(video_id)},
    playerVars:{autoplay:1,controls:0,playsinline:1,rel:0,modestbranding:1,iv_load_policy:3,disablekb:1,fs:0,
      start:${Math.floor(start || 0)}${end_time != null ? `,end:${Math.ceil(end_time)}` : ''}},
    events:{onReady:function(e){e.target.playVideo()},
      onStateChange:function(e){post({state:e.data,time:player.getCurrentTime()})}}});
  setInterval(function(){player&&player.getCurrentTime&&post({time:player.getCurrentTime()})},1000);
}
</script></body></html>`;

// Cover, not contain: overfill the box with the 16:9 frame and centre it, so
// a tall card crops the sides instead of letterboxing (contain in
// fullscreen). The WebView is TITLE_PAD taller top and bottom — the video
// letterboxes into that room, so YouTube's title bar lands outside the box
// and is clipped away.
const TITLE_PAD = 72;
function cover(box, fullscreen) {
  if (!box) return null;
  const pick = fullscreen ? Math.min : Math.max;
  const w = pick(box.width, (box.height * 16) / 9);
  const h = (w * 9) / 16;
  return { position: 'absolute', flex: 0, width: w, height: h + TITLE_PAD * 2, left: (box.width - w) / 2, top: (box.height - h) / 2 - TITLE_PAD };
}

function Player({ media, start, fullscreen, onFullscreen, onState, onTime, style }) {
  const web = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [box, setBox] = useState(null);
  const run = (js) => web.current?.injectJavaScript(`try{${js}}catch(e){};true;`);

  const onMessage = (e) => {
    let d;
    try {
      d = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (d.time != null) onTime?.(d.time);
    if (d.state === 1) setPlaying(true);
    if (d.state === 2) setPlaying(false);
    if (d.state === 0 || d.state === 1 || d.state === 2) onState?.(d.state === 1 ? 'playing' : d.state === 2 ? 'paused' : 'ended');
  };

  const toggle = () => {
    run(playing ? 'player.pauseVideo()' : 'player.playVideo()');
    setPlaying(!playing);
  };

  return (
    <View style={[styles.player, style]} onLayout={(e) => setBox(e.nativeEvent.layout)}>
      <WebView
        ref={web}
        source={{ html: page(media, start), baseUrl: 'https://genie.app' }}
        style={[styles.web, cover(box, fullscreen)]}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        javaScriptEnabled
        onMessage={onMessage}
        pointerEvents="none"
      />
      <PlayerControls playing={playing} fullscreen={fullscreen} onToggle={toggle} onFullscreen={onFullscreen} />
    </View>
  );
}

export default function ExternalVideo({ media, style, onState }) {
  const insets = useSafeAreaInsets();
  const time = useRef(media.start_time || 0);
  const [full, setFull] = useState(false);
  const [resumeAt, setResumeAt] = useState(media.start_time || 0);
  const [inlineKey, setInlineKey] = useState(0);

  const open = () => {
    setResumeAt(time.current);
    setFull(true);
  };
  const close = () => {
    setResumeAt(time.current);
    setFull(false);
    setInlineKey((k) => k + 1); // remount inline at the fullscreen position
  };
  const onTime = (t) => {
    time.current = t;
  };

  return (
    <>
      {full ? (
        <View style={[styles.player, style]} />
      ) : (
        <Player key={inlineKey} media={media} start={resumeAt} onFullscreen={open} onState={onState} onTime={onTime} style={style} />
      )}
      <Modal visible={full} animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={close}>
        <View style={[styles.modal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Player media={media} start={resumeAt} fullscreen onFullscreen={close} onState={onState} onTime={onTime} style={styles.fill} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  player: { backgroundColor: '#000', overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#000' },
  modal: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fill: { width: '100%', aspectRatio: 16 / 9 },
});
