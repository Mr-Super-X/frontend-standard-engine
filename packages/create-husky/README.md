# @mr.mikey/create-husky

## 说明

做项目基建时需要对团队成员commit-msg进行规范化限制，一般采用业界公认的angular提交规范，为了避免繁琐无聊的配置，将这个过程做成了npm包，通过安装包执行命令即可一键在项目中生成配置，并通过husky来创建git hook限制提交msg格式。

初始化完成后输入 `npm run commit` 在cmder终端演示效果：

![](https://github.com/Mr-Super-X/assets-resouece/raw/main/images/1653480834.jpg)

为了偷懒，建议安装`yarn`，通过`yarn commit`来运行能少输几个字符

## 使用

环境
> node: ^14.18.0 || >=16.0.0

安装依赖（用户名没取好，输入命令时记得加上引号）
> npm install "@mr.mikey/create-husky" -D

运行（用户名没取好，输入命令时记得加上引号）
> npm init "@mr.mikey/husky"

或者

> node ./node_modules/@mr.mikey/create-husky/index.js

运行 `npm init "@mr.mikey/husky"` 演示效果：

![](../../images/husky-demo.png)

## 自动生成&修改文件

package.json 会新增以下内容

```json
"scripts": {
  "prepare": "husky install",
  "commit": "git add . && cz",
  "push": "git add . && cz && git push"
},
"devDependencies": {
  "@commitlint/cli": "^17.6.7",
  "@commitlint/config-conventional": "^17.6.7",
  "commitizen": "^4.3.0",
  "commitlint-config-cz": "^0.13.3",
  "cz-customizable": "^7.0.0",
  "husky": "^8.0.3",
  "lint-staged": "^13.2.3"
}
"config": {
  "commitizen": {
    "path": "./node_modules/cz-customizable"
  },
  "cz-customizable": {
    "config": "./.cz-config.js"
  }
}
```

scripts说明

| 依赖    | 说明                                                   |
| ------- | ------------------------------------------------------ |
| prepare | npm install时自动触发husky安装，保证团队内成员都能使用 |
| commit  | 一键触发commit-msg交互选择工具并commit                 |
| push    | 一键触发commit-msg交互选择工具并push                   |

devDependencies说明（皆安装当前日期（2023/07/28）最新稳定版，安装时会固定以下版本号，防止某个包断崖式更新导致无法使用该功能）

| 依赖                                   | 说明                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| @commitlint/cli@17.6.7                 | commitlint基础，对commit-msg进行校验，不符合angular规范的commit信息将不允许提交                  |
| @commitlint/config-conventional@17.6.7 | 用于commitlint验证msg是否符合angular规范                                                         |
| commitizen@4.3.0                       | 友好的终端交互工具，输入命令即可自由选择符合angular规范的commit信息                              |
| commitlint-config-cz@0.13.3            | 用于cz的commitlint可共享配置文件可自定义（用于常规提交和常规变更日志的可自定义Commitizen适配器） |
| cz-customizable@7.0.0                  | 自定义汉化commitizen，提供符合国人喜好的中文配置                                                 |
| husky@8.0.3                            | git hook工具                                                                                     |
| lint-staged@13.2.3                     | 仅对commit的文件做lint校验工具                                                                   |

config说明

config中新增了commitizen的路径配置，默认配置为cz-customizable表示自定义commitizen，同时配置cz-customizable，让它读取生成的自定义配置文件.cz-config.js来实现汉化功能

根目录下新增文件

- lint-staged.config.js：lint-staged配置模板，可自行修改
- .cz-config.js：自定义终端汉化交互配置模板，可自行修改
- .commitlintrc.js：commitlint配置模板，可自行修改

## 试用步骤

1. 新建文件夹，如husky-demo
2. 打开终端进入husky-demo目录
3. 输入 `npm init -y` 创建package.json
4. 输入 `git init` 创建.git目录
5. 输入 `npm install "@mr.mikey/create-husky" -D` 安装依赖
6. 输入 `npm init "@mr.mikey/husky"` 执行依赖包
7. 根目录下添加.gitignore，将node_modules放进去，否则文件太多啦
8. 成功后即可体验输入 `npm run commit` 在终端选择规范的commit-msg

觉得好用不妨点个star呀🙋
