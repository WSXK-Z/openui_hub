<script setup lang='ts'>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
    src: {
        type: [String, URL],
        required: true
    },
    visibilityCheck: {
        type: Boolean,
        default: true
    },
    visibilityThreshold: {
        type: Number,
        default: 0
    },
    // 支持的通道，逗号分隔：webrtc, webrtc/tcp, mse, hls, mp4, mjpeg
    mode: {
        type: String,
        default: 'webrtc,mse,hls,mjpeg'
    },
    // 请求的媒体，逗号分隔：video, audio, microphone
    media: {
        type: String,
        default: 'video,audio'
    }
});

const emit = defineEmits<{
    (e: 'connect', result: boolean): void;
    (e: 'open', modes: string[]): void;
    (e: 'close'): void;
    (e: 'disconnect'): void;
    (e: 'message', msg: any): void;
    (e: 'pcvideo', pcState: number): void;
}>();

const DISCONNECT_TIMEOUT = 5000;
const RECONNECT_TIMEOUT = 15000;
const CODECS = [
    'avc1.640029',      // H.264 high 4.1 (Chromecast 1st and 2nd Gen)
    'avc1.64002A',      // H.264 high 4.2 (Chromecast 3rd Gen)
    'avc1.640033',      // H.264 high 5.1 (Chromecast with Google TV)
    'hvc1.1.6.L153.B0', // H.265 main 5.1 (Chromecast Ultra)
    'mp4a.40.2',        // AAC LC
    'mp4a.40.5',        // AAC HE
    'flac',             // FLAC (PCM compatible)
    'opus',             // OPUS Chrome, Firefox
];
const background = false;
const pcConfig: RTCConfiguration & { sdpSemantics: string } = {
    bundlePolicy: 'max-bundle',
    iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }],
    sdpSemantics: 'unified-plan',  // important for Chromecast 1
};

let ws: WebSocket | null = null;
let pc: RTCPeerConnection | null = null;
let mseCodecs = '';
let disconnectTID = 0;
let reconnectTID = 0;
let observer: IntersectionObserver | null = null;

const MEDIA_ERRORS: { [key: number]: string } = {
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
};
const baseVideo = ref<HTMLVideoElement | null>(null);
const isHidden = ref<boolean>(false);
const isConnected = ref<boolean>(false);
const wsState = ref<number>(WebSocket.CLOSED);
const pcState = ref<number>(WebSocket.CLOSED);
const connectTS = ref<number>(0);
const wsURL = computed(() => {
    let value: string = typeof props.src === 'string' ? props.src : props.src.toString();
    if (value.startsWith('http')) {
        value = 'ws' + value.substring(4);
    } else if (value.startsWith('/')) {
        value = 'ws' + location.origin.substring(4) + value;
    }
    return value;
});
const onerror = (e: Event) => {
    console.error('[VideoRTC] Video error event:', e);
    const err = baseVideo.value?.error;
    console.error('[VideoRTC] Video error:', {
        error: err ? MEDIA_ERRORS[err.code] : 'unknown',
        message: err ? err.message : 'unknown',
        codecs: mseCodecs || 'not set',
        readyState: baseVideo.value?.readyState,
        networkState: baseVideo.value?.networkState,
        currentTime: baseVideo.value?.currentTime
    });
    if (ws) ws.close(); // run reconnect for broken MSE stream
}
const onVisibilitychange = () => {
    isHidden.value = document.hidden;
}
let onmessage: { [key: string]: Function } = {};
let ondata: ((data: ArrayBuffer) => void) | null = null;
const play = () => {
    const video = baseVideo.value;
    if (!video) return;

    video.play().catch(() => {
        if (!video.muted) {
            video.muted = true;
            video.play().catch(er => {
                console.warn(er);
            });
        }
    });
}
const send = (value: object) => {
    if (ws) ws.send(JSON.stringify(value));
}
const codecs = (isSupported: (type: string) => boolean | string) => {
    return CODECS
        .filter(codec => props.media.includes(codec.includes('vc1') ? 'video' : 'audio'))
        .filter(codec => isSupported(`video/mp4; codecs="${codec}"`)).join();
}
const bufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    let binary = '';
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
}
const connect = () => {
    if (!isConnected.value || !wsURL.value || ws || pc) {
        emit('connect', false);
        return false;
    }
    wsState.value = WebSocket.CONNECTING;
    connectTS.value = Date.now();
    ws = new WebSocket(wsURL.value);
    ws.binaryType = 'arraybuffer';
    ws.addEventListener('open', onopen);
    ws.addEventListener('close', onclose);
    emit('connect', true);
    return true;
}
const disconnect = () => {
    emit('disconnect');

    wsState.value = WebSocket.CLOSED;
    if (ws) {
        ws.close();
        ws = null;
    }

    pcState.value = WebSocket.CLOSED;
    if (pc) {
        pc.getSenders().forEach(sender => {
            if (sender.track) sender.track.stop();
        });
        pc.close();
        pc = null;
    }

    const video = baseVideo.value;
    if (video) {
        video.src = '';
        video.srcObject = null;
    }
}
const onopen = () => {
    if (!ws) {
        return;
    }
    console.log('[VideoRTC] WebSocket opened');
    wsState.value = WebSocket.OPEN;
    ws.addEventListener('message', ev => {
        if (typeof ev.data === 'string') {
            const msg = JSON.parse(ev.data);
            for (const key in onmessage) {
                onmessage[key]!(msg);
            }
            emit('message', msg);
        } else if (ondata) {
            ondata(ev.data);
        }
    })

    const video = baseVideo.value;

    ondata = null;
    onmessage = {};

    const modes: string[] = [];

    if (props.mode.includes('mse') && ('MediaSource' in window || 'ManagedMediaSource' in window)) {
        modes.push('mse');
        onmse();
    } else if (props.mode.includes('hls') && (video ? video.canPlayType('application/vnd.apple.mpegurl') : '')) {
        modes.push('hls');
        onhls();
    } else if (props.mode.includes('mp4')) {
        modes.push('mp4');
        onmp4();
    }

    if (props.mode.includes('webrtc') && 'RTCPeerConnection' in window) {
        modes.push('webrtc');
        onwebrtc();
    }

    if (props.mode.includes('mjpeg')) {
        if (modes.length) {
            onmessage['mjpeg'] = (msg: any) => {
                if (msg.type !== 'error' || msg.value.indexOf(modes[0]!) !== 0) return;
                onmjpeg();
            };
        } else {
            modes.push('mjpeg');
            onmjpeg();
        }
    }

    emit('open', modes);

    return modes;
}
const onclose = () => {
    console.log('[VideoRTC] WebSocket closed');
    emit('close');
    if (wsState.value === WebSocket.CLOSED) return false;

    // CONNECTING, OPEN => CONNECTING
    wsState.value = WebSocket.CONNECTING;
    ws = null;

    // reconnect no more than once every X seconds
    const delay = Math.max(RECONNECT_TIMEOUT - (Date.now() - connectTS.value), 0);

    reconnectTID = window.setTimeout(() => {
        reconnectTID = 0;
        connect();
    }, delay);

    return true;
}
const onConnected = () => {
    if (disconnectTID) {
        window.clearTimeout(disconnectTID);
        disconnectTID = 0;
    }

    // because video autopause on disconnected from DOM
    const video = baseVideo.value;
    if (video) {
        const seek = video.seekable;
        if (seek.length > 0) {
            video.currentTime = seek.end(seek.length - 1);
        }
        play();
    }

    connect();
}
const onDisconnected = () => {
    if (background || disconnectTID) return;
    if (wsState.value === WebSocket.CLOSED && pcState.value === WebSocket.CLOSED) return;

    disconnectTID = window.setTimeout(() => {
        if (reconnectTID) {
            window.clearTimeout(reconnectTID);
            reconnectTID = 0;
        }

        disconnectTID = 0;

        disconnect();
    }, DISCONNECT_TIMEOUT);
}
const onmse = () => {
    const video = baseVideo.value;
    if (!video) return;

    let ms: MediaSource;

    if ('ManagedMediaSource' in window) {
        const ManagedMediaSource = (window as any).ManagedMediaSource;

        ms = new ManagedMediaSource() as MediaSource;
        ms.addEventListener('sourceopen', () => {
            send({ type: 'mse', value: codecs(ManagedMediaSource.isTypeSupported) });
        }, { once: true });

        video.disableRemotePlayback = true;
        video.srcObject = ms;
    } else {
        ms = new MediaSource();
        ms.addEventListener('sourceopen', () => {
            URL.revokeObjectURL(video.src);
            send({ type: 'mse', value: codecs(MediaSource.isTypeSupported) });
        }, { once: true });

        video.src = URL.createObjectURL(ms);
        video.srcObject = null;
    }

    play();

    mseCodecs = '';

    onmessage['mse'] = (msg: any) => {
        if (msg.type !== 'mse') return;

        mseCodecs = msg.value;

        const sb = ms.addSourceBuffer(msg.value);
        sb.mode = 'segments'; // segments or sequence

        const buf = new Uint8Array(2 * 1024 * 1024);
        let bufLen = 0;

        sb.addEventListener('updateend', () => {
            if (!sb.updating && bufLen > 0) {
                try {
                    const data = buf.slice(0, bufLen);
                    sb.appendBuffer(data);
                    bufLen = 0;
                } catch {
                    // ignore append errors of broken stream
                }
            }

            if (!sb.updating && sb.buffered && sb.buffered.length) {
                const end = sb.buffered.end(sb.buffered.length - 1);
                const start = end - 5;
                const start0 = sb.buffered.start(0);
                if (start > start0) {
                    sb.remove(start0, start);
                    ms.setLiveSeekableRange(start, end);
                }
                if (video.currentTime < start) {
                    video.currentTime = start;
                }
                const gap = end - video.currentTime;
                video.playbackRate = gap > 0.1 ? gap : 0.1;
            }
        });

        ondata = data => {
            if (sb.updating || bufLen > 0) {
                const b = new Uint8Array(data);
                buf.set(b, bufLen);
                bufLen += b.byteLength;
            } else {
                try {
                    sb.appendBuffer(data);
                } catch {
                    // ignore append errors of broken stream
                }
            }
        };
    };
}
const onwebrtc = () => {
    const conn = new RTCPeerConnection(pcConfig);

    conn.addEventListener('icecandidate', ev => {
        if (ev.candidate && props.mode.includes('webrtc/tcp') && ev.candidate.protocol === 'udp') return;

        const candidate = ev.candidate ? ev.candidate.toJSON().candidate : '';
        send({ type: 'webrtc/candidate', value: candidate });
    });

    conn.addEventListener('connectionstatechange', () => {
        if (conn.connectionState === 'connected') {
            const tracks = conn.getTransceivers()
                .filter(tr => tr.currentDirection === 'recvonly') // skip inactive
                .map(tr => tr.receiver.track);
            const video2 = document.createElement('video');
            video2.addEventListener('loadeddata', () => onpcvideo(video2), { once: true });
            video2.srcObject = new MediaStream(tracks);
        } else if (conn.connectionState === 'failed' || conn.connectionState === 'disconnected') {
            conn.close(); // stop next events

            pcState.value = WebSocket.CLOSED;
            pc = null;

            connect();
        }
    });

    onmessage['webrtc'] = (msg: any) => {
        switch (msg.type) {
            case 'webrtc/candidate':
                if (props.mode.includes('webrtc/tcp') && msg.value.includes(' udp ')) return;

                conn.addIceCandidate({ candidate: msg.value, sdpMid: '0' }).catch(er => {
                    console.warn(er);
                });
                break;
            case 'webrtc/answer':
                conn.setRemoteDescription({ type: 'answer', sdp: msg.value }).catch(er => {
                    console.warn(er);
                });
                break;
            case 'error':
                if (!msg.value.includes('webrtc/offer')) return;
                conn.close();
        }
    };

    createOffer(conn).then(offer => {
        send({ type: 'webrtc/offer', value: offer.sdp });
    });

    pcState.value = WebSocket.CONNECTING;
    pc = conn;
}
const createOffer = async (conn: RTCPeerConnection) => {
    try {
        if (props.media.includes('microphone')) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => {
                conn.addTransceiver(track, { direction: 'sendonly' });
            });
        }
    } catch (e) {
        console.warn(e);
    }

    for (const kind of ['video', 'audio'] as const) {
        if (props.media.includes(kind)) {
            conn.addTransceiver(kind, { direction: 'recvonly' });
        }
    }

    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);
    return offer;
}
const onpcvideo = (video2: HTMLVideoElement) => {
    const video = baseVideo.value;

    if (pc && video) {
        // Video+Audio > Video, H265 > H264, Video > Audio, WebRTC > MSE
        let rtcPriority = 0, msePriority = 0;

        const stream = video2.srcObject as MediaStream;
        if (stream.getVideoTracks().length > 0) {
            // not the best, but a pretty simple way to check a codec
            const isH265Supported = pc.remoteDescription?.sdp.includes('H265/90000') ?? false;
            rtcPriority += isH265Supported ? 0x240 : 0x220;
        }
        if (stream.getAudioTracks().length > 0) rtcPriority += 0x102;

        if (mseCodecs.includes('hvc1.')) msePriority += 0x230;
        if (mseCodecs.includes('avc1.')) msePriority += 0x210;
        if (mseCodecs.includes('mp4a.')) msePriority += 0x101;

        if (rtcPriority >= msePriority) {
            video.srcObject = stream;
            play();

            pcState.value = WebSocket.OPEN;

            wsState.value = WebSocket.CLOSED;
            if (ws) {
                ws.close();
                ws = null;
            }
        } else {
            pcState.value = WebSocket.CLOSED;
            if (pc) {
                pc.close();
                pc = null;
            }
        }
    }

    video2.srcObject = null;

    emit('pcvideo', pcState.value);
}
const onmjpeg = () => {
    ondata = data => {
        const video = baseVideo.value;
        if (!video) return;

        video.controls = false;
        video.poster = 'data:image/jpeg;base64,' + bufferToBase64(data);
    };

    send({ type: 'mjpeg' });
}
const onhls = () => {
    onmessage['hls'] = (msg: any) => {
        if (msg.type !== 'hls') return;

        const video = baseVideo.value;
        if (!video) return;

        const url = 'http' + wsURL.value.substring(2, wsURL.value.indexOf('/ws')) + '/hls/';
        const playlist = msg.value.replace('hls/', url);
        video.src = 'data:application/vnd.apple.mpegurl;base64,' + btoa(playlist);
        play();
    };

    const video = baseVideo.value;
    if (!video) return;

    send({ type: 'hls', value: codecs(type => video.canPlayType(type)) });
}
const onmp4 = () => {
    const video = baseVideo.value;
    if (!video) return;

    const canvas = document.createElement('canvas');
    let context: CanvasRenderingContext2D | null = null;

    const video2 = document.createElement('video');
    video2.autoplay = true;
    video2.playsInline = true;
    video2.muted = true;

    video2.addEventListener('loadeddata', () => {
        if (!context) {
            canvas.width = video2.videoWidth;
            canvas.height = video2.videoHeight;
            context = canvas.getContext('2d');
        }

        context?.drawImage(video2, 0, 0, canvas.width, canvas.height);

        video.controls = false;
        video.poster = canvas.toDataURL('image/jpeg');
    });

    ondata = data => {
        video2.src = 'data:video/mp4;base64,' + bufferToBase64(data);
    };

    send({ type: 'mp4', value: codecs(type => video.canPlayType(type)) });
}
const init = () => {
    if (!baseVideo.value) {
        return;
    }

    // all Safari lies about supported audio codecs
    const m = window.navigator.userAgent.match(/Version\/(\d+).+Safari/);
    if (m) {
        // AAC from v13, FLAC from v14, OPUS - unsupported
        const skip = m[1]! < '13' ? 'mp4a.40.2' : m[1]! < '14' ? 'flac' : 'opus';
        CODECS.splice(CODECS.indexOf(skip));
    }

    if (background) return;

    if ('hidden' in document && props.visibilityCheck) {
        isHidden.value = document.hidden;
        document.addEventListener('visibilitychange', onVisibilitychange);
    }
    if ('IntersectionObserver' in window && props.visibilityThreshold) {
        observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    onDisconnected();
                } else if (isConnected.value) {
                    onConnected();
                }
            });
        }, { threshold: props.visibilityThreshold });
        observer.observe(baseVideo.value as Element);
    }

}

watch(wsURL, () => {
    connect();
});
watch(isHidden, hidden => {
    if (hidden) {
        onDisconnected();
    } else {
        onConnected();
    }
});

onMounted(() => {
    console.log('VideoRTC mounted');
    console.log('props.src', props.src);
    isConnected.value = true;
    init();
    onConnected();
})
onBeforeUnmount(() => {
    isConnected.value = false;

    if (disconnectTID) {
        window.clearTimeout(disconnectTID);
        disconnectTID = 0;
    }
    if (reconnectTID) {
        window.clearTimeout(reconnectTID);
        reconnectTID = 0;
    }

    observer?.disconnect();
    observer = null;
    document.removeEventListener('visibilitychange', onVisibilitychange);

    disconnect();
})

defineExpose({ play, send });
</script>

<template>
    <video ref="baseVideo" playsinline muted controls preload="auto" @error="onerror"></video>
</template>

<style scoped>
video {
    display: block;
    /* fix bottom margin 4px */
    width: 100%;
    height: 100%;
}
</style>