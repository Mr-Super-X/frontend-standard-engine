import {
  existsSync,
  readdirSync,
  lstatSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { join } from "node:path";

export function getLintStagedOption(lint) {
	const jsOp = [],
		jsonOp = [],
		pakOp = [],
		vueOp = [],
		styleOp = [],
		mdOp = [];
	if (lint.includes("eslint")) {
		jsOp.push("eslint --fix");
		vueOp.push("eslint --fix");
	}
	if (lint.includes("prettier")) {
		jsOp.push("prettier --write");
		vueOp.push("prettier --write");
		mdOp.push("prettier --write");
		jsonOp.push("prettier --write--parser json");
		pakOp.push("prettier --write");
		styleOp.push("prettier --write");
	}
	if (lint.includes("stylelint")) {
		vueOp.push("stylelint --fix");
		styleOp.push("stylelint --fix");
	}
	return {
		"*.{js,jsx,ts,tsx}": jsOp,
		"{!(package)*.json,*.code-snippets,.!(browserslist)*rc}": jsonOp,
		"package.json": pakOp,
		"*.vue": vueOp,
		"*.{scss,less,styl,html}": styleOp,
		"*.md": mdOp,
	};
}

/**
 * 递归删除文件/文件目录
 * @param {*} folderPath 文件/文件夹路径
 */
export function deleteFolderRecursive(folderPath) {
  // 判断文件夹是否存在
  if (existsSync(folderPath)) {
    // 读取文件夹下的文件目录，以数组形式输出
    readdirSync(folderPath).forEach((file) => {
      // 拼接路径
      const curPath = join(folderPath, file);
      // 判断是不是文件夹，如果是，继续递归
      if (lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        // 删除文件或文件夹
        unlinkSync(curPath);
      }
    });

    // 仅可用于删除空目录
    rmdirSync(folderPath);
  }
}