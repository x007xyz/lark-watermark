<script setup lang="ts">
import {
  FieldType,
  IAttachmentField,
  IOpenAttachment,
  bitable,
} from "@lark-base-open/js-sdk";
import dayjs from "dayjs";
import { dataURItoFile } from "./utils";
import "@arco-design/web-vue/lib/message/style/css";
import { Message } from "@arco-design/web-vue";

const canvasRef = ref<HTMLCanvasElement>();

const form = reactive({
  hasDate: true,
  hasPosition: true,
  fontSize: 24,
});

const position = ref<{
  latitude: number;
  longitude: number;
}>();

const positionDisable = ref(false);

const loading = ref(false);

const loadingTip = ref("");

watch(
  () => form.hasPosition,
  (hasPosition) => {
    if (hasPosition) {
      if (!navigator.geolocation) {
        Message.warning("你的浏览器不支持地理位置");
        positionDisable.value = true;
        form.hasPosition = false;
      } else {
        navigator.geolocation.getCurrentPosition(
          (res) => {
            positionDisable.value = false;
            position.value = {
              latitude: res.coords.latitude,
              longitude: res.coords.longitude,
            };
          },
          (err) => {
            positionDisable.value = true;
            form.hasPosition = false;
            Message.error(`获取地理位置失败：${err.message}`);
          },
        );
      }
    }
  },
  { immediate: true, deep: true },
);

function watermark(url: string, filename: string, type: string): Promise<File> {
  let markText = "";
  if (form.hasDate) {
    markText += dayjs().format("YYYY-MM-DD HH:mm:ss");
  }
  if (form.hasPosition) {
    markText += position.value?.latitude + "," + position.value?.longitude;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = "anonymous";
    img.onload = function () {
      if (!canvasRef.value) {
        return;
      }
      // 在图片加载完成之后绘制水印
      var ctx = canvasRef.value.getContext("2d") as CanvasRenderingContext2D;

      canvasRef.value.width = img.width;
      canvasRef.value.height = img.height;

      // 在 Canvas 上绘制图片
      ctx.drawImage(img, 0, 0);

      // 添加水印文本
      ctx.font = `${form.fontSize}px Arial`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.textAlign = "center";
      ctx.fillText(
        markText,
        canvasRef.value.width / 2,
        canvasRef.value.height / 2,
      );
      resolve(dataURItoFile(canvasRef.value.toDataURL(type), filename, type));
    };
  });
}
// 保存当前的值
let curVals: IOpenAttachment[] = [];
// 保存更新后的值
let newVals: IOpenAttachment[] = [];
onMounted(async () => {
  const table = await bitable.base.getActiveTable();
  table.onRecordModify(async ({ data }) => {
    const meta = await table.getFieldMetaById(data.fieldIds[0]);
    if (meta.type !== FieldType.Attachment) {
      return;
    }
    const field = await table.getField<IAttachmentField>(data.fieldIds[0]);
    // 获取新的附件值
    newVals = (await field.getValue(data.recordId)) || [];
    // 对比newVals和curVals，获取新增附件的index
    const index = newVals.findIndex(
      (item) => !curVals.map(({ token }) => token).includes(item.token),
    );
    if (index > -1) {
      loading.value = true;
      loadingTip.value = "正在生成水印...";
      const urls = await field.getAttachmentUrls(data.recordId);
      const file = await watermark(
        urls[index],
        newVals[index].name,
        newVals[index].type,
      );
      const tokens = await bitable.base.batchUploadFile([file]);
      const attachment: IOpenAttachment = {
        name: file.name,
        type: file.type,
        size: file.size,
        timeStamp: file.lastModified,
        token: tokens[0],
      };
      newVals.splice(index, 1, attachment);
      field.setValue(data.recordId, newVals);
      curVals = newVals;
      loading.value = false;
    }
  });
  bitable.base.onSelectionChange(async (params) => {
    // 在选择区域修改后，获取选择区域
    if (params.data.fieldId && params.data.recordId) {
      // 获取字段信息，判断是否为附件类型
      const meta = await table.getFieldMetaById(params.data.fieldId);
      if (meta.type !== FieldType.Attachment) {
        return;
      }
      const field = await table.getField<IAttachmentField>(params.data.fieldId);
      // 获取附件的 URL
      // const urls = await field.getAttachmentUrls(params.data.recordId);
      // 获取附近的值
      curVals = (await field.getValue(params.data.recordId)) || [];
    }
  });
});
</script>

<template>
  <ASpin :loading="loading" :tip="loadingTip" style="width: 100%">
    <div style="width: 100%; height: 100%">
      <ACollapse>
        <a-collapse-item key="1" header="水印配置">
          <AForm :model="form" layout="horizontal" auto-label-width>
            <AFormItem field="hasDate" label="时间水印">
              <ASwitch v-model="form.hasDate" />
            </AFormItem>
            <AFormItem field="hasPosition" label="位置水印">
              <ASwitch v-model="form.hasPosition" :disabled="positionDisable" />
            </AFormItem>
            <AFormItem field="fontSize" label="水印字号">
              <AInputNumber v-model="form.fontSize" :min="10" :max="100" />
            </AFormItem>
          </AForm>
        </a-collapse-item>
      </ACollapse>
    </div>
  </ASpin>
  <canvas ref="canvasRef" class="canvas"></canvas>
</template>

<style scoped>
.canvas {
  position: fixed;
  bottom: 9999px;
  right: 9999px;
}
</style>
