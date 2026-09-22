<script setup lang='ts'>
import { ref } from 'vue';
import VideoRTC from './VideoRTC.vue';

defineProps({
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
    }
});

/**
 * @type {InstanceType<typeof VideoRTC>|null}
 */
const player = ref<InstanceType<typeof VideoRTC> | null>(null);

/**
 * [info] 当前播放方式（loading / error / MSE / HLS / MP4 / MJPEG / RTC）
 * @type {string}
 */
const mode = ref<string>('');

/**
 * [info] 错误信息，仅在 `mode` 为 `loading` 时的错误会被记录
 * @type {string}
 */
const status = ref<string>('');

const setMode = (value: string) => {
    mode.value = value;
    status.value = '';
}
const setError = (value: string) => {
    if (mode.value !== 'loading') return;
    mode.value = 'error';
    status.value = value;
}
const onConnect = (result: boolean) => {
    if (result) setMode('loading');
}
const onMessage = (msg: any) => {
    switch (msg.type) {
        case 'error':
            setError(msg.value);
            break;
        case 'mse':
        case 'hls':
        case 'mp4':
        case 'mjpeg':
            setMode(msg.type.toUpperCase());
            break;
    }
}
const onPcvideo = (state: number) => {
    if (state !== WebSocket.CLOSED) setMode('RTC');
}
const play = () => {
    player.value?.play();
}
const send = (value: object) => {
    player.value?.send(value);
}

defineExpose({ mode, status, play, send });
</script>

<template>
    <div class="video-stream">
        <VideoRTC ref="player" :src="src" :visibility-check="visibilityCheck"
            :visibility-threshold="visibilityThreshold" @connect="onConnect" @message="onMessage" @pcvideo="onPcvideo">
        </VideoRTC>
        <div class="info">
            <div class="status">{{ status }}</div>
            <div class="mode">{{ mode }}</div>
        </div>
    </div>
</template>

<style scoped>
/* 尺寸交给使用方（容器/类），组件只保证叠加层定位以及 video 撑满 */
.video-stream {
    position: relative;
    display: block;
}

.info {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 12px;
    color: white;
    display: flex;
    justify-content: space-between;
    pointer-events: none;
}
</style>
