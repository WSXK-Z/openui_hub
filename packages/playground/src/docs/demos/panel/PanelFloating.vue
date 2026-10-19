<template>
    <DpPage :comp="{ anchorGap: 12 }"
        style="height: 340px; overflow: hidden; border: 1px solid var(--dp-color-border); border-radius: var(--dp-radius-md); background: var(--dp-color-surface-2)">
        <DpPanel :comp="{
            title: '可操作面板',
            fixed: true,
            movable: true,
            resizable: true,
            collapsible: true,
            showTools: true,
            anchor: 'center',
            width: 300,
            height: 190,
        }">
            <div class="flex flex-col gap-2 text-xs leading-5 text-[var(--dp-color-fg-2)]">
                <span>标题栏可拖动，右下角可缩放。</span>
                <span>工具条提供折叠、重置与置顶。</span>
                <DpButton :theme="{ size: 'small', variant: 'primary' }" block>操作按钮</DpButton>
            </div>
        </DpPanel>
    </DpPage>
</template>
