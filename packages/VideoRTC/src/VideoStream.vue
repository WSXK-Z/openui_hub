<script setup lang='ts'>
import { ref } from 'vue';
import type { PropType } from 'vue';
import VideoRTC from './VideoRTC.vue';

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
    },
    // 画面适配：fill 铺满（默认，与上游一致）/ contain 等比留边 / cover 等比裁切
    fit: {
        type: String as PropType<'fill' | 'contain' | 'cover'>,
        default: 'fill'
    },
    // 容器比例（CSS aspect-ratio，如 '16/9'、'4/3'、'auto'），留空表示不设置；
    // 作用在组件根元素上，设了比例就能只给宽度
    ratio: {
        type: String,
        default: ''
    }
});

/**
 * @type {InstanceType<typeof VideoRTC>|null}
 */
const player = ref<InstanceType<typeof VideoRTC> | null>(null);

/**
 * [info] 当前播放方式（loading / error / MSE / HLS / MP4 / MJPEG / RTC）
 * 变量名不叫 mode，避免与同名 prop 相互遮蔽
 * @type {string}
 */
const channel = ref<string>('');

/**
 * [info] 错误信息，仅在 `channel` 为 `loading` 时的错误会被记录
 * @type {string}
 */
const statusText = ref<string>('');

const setChannel = (value: string) => {
    channel.value = value;
    statusText.value = '';
}
const setError = (value: string) => {
    if (channel.value !== 'loading') return;
    channel.value = 'error';
    statusText.value = value;
}
const onConnect = (result: boolean) => {
    if (result) setChannel('loading');
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
            setChannel(msg.type.toUpperCase());
            break;
    }
}
const onPcvideo = (state: number) => {
    if (state !== WebSocket.CLOSED) setChannel('RTC');
}
const play = () => {
    player.value?.play();
}
const send = (value: object) => {
    player.value?.send(value);
}

defineExpose({ mode: channel, status: statusText, play, send });
</script>

<template>
    <div class="video-stream" :style="props.ratio ? { aspectRatio: props.ratio } : null">
        <VideoRTC ref="player" :src="props.src" :visibility-check="props.visibilityCheck"
            :visibility-threshold="props.visibilityThreshold" :mode="props.mode" :media="props.media" :fit="props.fit"
            @connect="onConnect" @message="onMessage" @pcvideo="onPcvideo">
        </VideoRTC>
        <div class="info">
            <div class="status">{{ statusText }}</div>
            <div class="mode">{{ channel }}</div>
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
