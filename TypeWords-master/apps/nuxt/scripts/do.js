const { SitemapStream, streamToPromise } = require('sitemap')
const { createWriteStream } = require('fs')
const { resolve } = require('path')

async function generateSitemap() {
  const bookList = require('../public/list/article.json')
  const dictList = require('../public/list/word.json')
  const SITE_URL = 'https://typewords.cc'

  // 静态路由（首页、练习页等）
  const staticPages = [
    { url: '/index.html', changefreq: 'monthly', priority: 1.0 },
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/words', changefreq: 'daily', priority: 0.9 },
    { url: '/articles', changefreq: 'daily', priority: 0.9 },
    { url: '/setting', changefreq: 'monthly', priority: 0.3 },
    { url: '/qa', changefreq: 'weekly', priority: 0.3 },
    { url: '/doc', changefreq: 'weekly', priority: 0.3 },
    { url: '/feedback', changefreq: 'weekly', priority: 0.3 },
  ]

  // 动态页面示例（假设你有文章或单词数据）
  const dynamicPages = bookList
    .flat()
    .map(book => {
      return { url: '/book-detail/' + book.id, changefreq: 'weekly', priority: 0.8 }
    })
    .concat(
      dictList.flat().map(book => {
        return { url: '/practice-words/' + book.id, changefreq: 'weekly', priority: 0.8 }
      })
    )
  const sitemap = new SitemapStream({ hostname: SITE_URL })
  const writeStream = createWriteStream(resolve(__dirname, '../dist/sitemap.xml'))

  sitemap.pipe(writeStream)

  // 添加静态页
  staticPages.forEach(page => sitemap.write(page))

  // 添加动态页
  dynamicPages.forEach(page => sitemap.write(page))

  sitemap.end()

  await streamToPromise(sitemap)
  console.log('✅ sitemap.xml 已生成在 dist 目录')
}

generateSitemap()
