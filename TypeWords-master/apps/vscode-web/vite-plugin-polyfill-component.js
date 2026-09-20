/**
 * vite-plugin-polyfill-component
 *
 * 在编译期将主仓中 Nuxt 专属组件的 import 自动重定向到 @/z-polyfill/ 下的替代实现，
 * 这样同步主工程代码时无需手动修改 import 路径。
 *
 * 替换规则：
 *   1. import { BasePage, ... } from '@typewords/base'
 *      → 整行替换：拆出 BasePage 行，其余具名导入保留（原地替换，不改变位置）
 *
 *   2. import PracticeLayout from '@typewords/core/components/PracticeLayout.vue'
 *      → import PracticeLayout from '@/z-polyfill/PracticeLayout.vue'
 */

// 需要从 @typewords/base 中拆出的组件 → z-polyfill 映射
const namedImports = {
  BasePage: '@/z-polyfill/BasePage.vue',
}

// 完整路径重定向规则：源路径（字符串）→ 目标路径
const pathRedirects = [
  {
    source: '@typewords/core/components/PracticeLayout.vue',
    target: '@/z-polyfill/PracticeLayout.vue',
  },
]

export default function polyfillComponentPlugin() {
  return {
    name: 'polyfill-component',
    transform(code, id) {
      // 只处理 .ts 和 .vue 文件
      if (!id.endsWith('.ts') && !id.endsWith('.vue')) return
      // 跳过 z-polyfill 目录自身，避免循环替换
      if (id.includes('z-polyfill')) return

      let modified = false
      let newCode = code

      // ---------- 规则 1：从 @typewords/base 中拆出需要替换的具名导入 ----------
      // 原地替换整行，不改变 import 在文件中的位置，避免插入到 <script> 标签外面
      if (newCode.includes('@typewords/base')) {
        for (const [componentName, polyfillPath] of Object.entries(namedImports)) {
          // 匹配: import { ...BasePage... } from '@typewords/base'
          // s flag：让 [^}] 和 . 能跨行匹配多行具名导入
          const importRegex = new RegExp(
            `(import\\s*\\{[^}]*?)\\b${componentName}\\b(.*?\\}\\s*from\\s*['"]@typewords/base['"])`,
            's',
          )
          if (!importRegex.test(newCode)) continue

          newCode = newCode.replace(importRegex, (_, before, after) => {
            // 从原具名列表中去掉 componentName，清理残留逗号
            const remaining = `${before}${after}`
              .replace(/,\s*,/g, ',')   // 组件在中间：, BasePage ,  →  ,
              .replace(/\{\s*,/g, '{')  // 组件在首位：{ BasePage,   →  {
              .replace(/,\s*\}/g, ' }') // 组件在末尾：, BasePage }  →  }

            // 判断去掉后花括号内是否还有其他导入
            const emptyBraces = /\{\s*\}/.test(remaining)
            if (emptyBraces) {
              // 原来只有 BasePage 一个，整行替换为新 import
              return `import ${componentName} from '${polyfillPath}'`
            } else {
              // 还有其他导入，保留原行并在其前面插入新 import
              return `import ${componentName} from '${polyfillPath}'\n${remaining}`
            }
          })

          modified = true
        }
      }

      // ---------- 规则 2：完整路径重定向（直接字符串替换，无 lastIndex 问题）----------
      for (const { source, target } of pathRedirects) {
        if (!newCode.includes(source)) continue
        // 转义 source 中的正则特殊字符
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        newCode = newCode.replace(
          new RegExp(`(from\\s*['"])${escaped}(['"])`, 'g'),
          `$1${target}$2`,
        )
        modified = true
      }

      return modified ? newCode : null
    },
  }
}
