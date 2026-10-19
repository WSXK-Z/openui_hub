<template>
    <div class="flex flex-col gap-3">
        <DpAlert :theme="{ variant: 'info' }" :comp="{ title: '提示' }">这是一条提示信息</DpAlert>
        <DpAlert :theme="{ variant: 'success' }" :comp="{ title: '成功', closable: true }">操作已成功</DpAlert>
        <DpAlert :theme="{ variant: 'warning' }" :comp="{ title: '警告' }">请注意风险</DpAlert>
        <DpAlert :theme="{ variant: 'danger' }" :comp="{ title: '错误' }">发生错误</DpAlert>
        <DpAlert :theme="{ variant: 'info' }" :comp="{ title: '可关闭', closable: true }">
            点击右侧关闭按钮可以关闭这条警告。
        </DpAlert>
    </div>
</template>
