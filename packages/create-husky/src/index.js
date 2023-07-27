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