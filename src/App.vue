<script setup lang="ts">
import {
  FieldType,
  IAttachmentField,
  IOpenAttachment,
  bitable,
} from "@lark-base-open/js-sdk";
import { dataURItoFile } from "./utils";

const canvasRef = ref<HTMLCanvasElement>();

function watermark(url: string, filename: string, type: string): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = "anonymous";
    img.onload = function () {
      console.log(canvasRef.value);
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
      ctx.font = "30px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.textAlign = "center";
      ctx.fillText(
        "你的水印文字",
        canvasRef.value.width / 2,
        canvasRef.value.height - 30,
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
    newVals = await field.getValue(data.recordId);
    console.log("record modify", newVals, curVals);
    // 对比newVals和curVals，获取新增附件的index
    const index = newVals.findIndex(
      (item) => !curVals.map(({ token }) => token).includes(item.token),
    );
    if (index > -1) {
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
      curVals = await field.getValue(params.data.recordId);
    }
  });
});
</script>

<template>
  <div>
    <AButton>Save</AButton>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped></style>
