import { readFileSync } from 'node:fs';
import {
  type DefaultTheme,
  type HeadConfig,
  type PageData,
  defineConfig,
} from 'vitepress';

const repo = 'https://github.com/maitrungduc1410/react-native-signature-ink';
const base = '/react-native-signature-ink/';
// Production origin + base. Sitemap URLs and canonical links are built from it.
const site = `https://maitrungduc1410.github.io${base}`;
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as { version: string };

// Written by `yarn api` (TypeDoc) before VitePress runs.
const apiSidebar = JSON.parse(
  readFileSync(new URL('../api/typedoc-sidebar.json', import.meta.url), 'utf8')
) as DefaultTheme.SidebarItem[];

type Labels = {
  guide: string;
  api: string;
  groups: [string, string, string, string];
  pages: Record<(typeof slugs)[number], string>;
  changelog: string;
};

const slugs = [
  '',
  'installation',
  'quick-start',
  'props',
  'methods',
  'toolbar',
  'events',
  'export',
  'stroke-data',
  'platform-differences',
  'performance',
  'troubleshooting',
] as const;

const groups: (typeof slugs)[number][][] = [
  ['', 'installation', 'quick-start'],
  ['props', 'methods', 'toolbar', 'events'],
  ['export', 'stroke-data'],
  ['platform-differences', 'performance', 'troubleshooting'],
];

function guideSidebar(prefix: string, l: Labels): DefaultTheme.SidebarItem[] {
  return groups.map((group, i) => ({
    text: l.groups[i],
    items: group.map((slug) => ({
      text: l.pages[slug],
      link: `${prefix}/guide/${slug}`,
    })),
  }));
}

function themeConfig(prefix: string, l: Labels): DefaultTheme.Config {
  return {
    nav: [
      {
        text: l.guide,
        link: `${prefix}/guide/`,
        activeMatch: `^${prefix}/guide/`,
      },
      { text: l.api, link: '/api/', activeMatch: '^/api/' },
      {
        text: `v${version}`,
        items: [
          { text: l.changelog, link: `${repo}/releases` },
          {
            text: 'npm',
            link: 'https://www.npmjs.com/package/react-native-signature-ink',
          },
        ],
      },
    ],
    sidebar: {
      [`${prefix}/guide/`]: guideSidebar(prefix, l),
      '/api/': [{ text: l.api, link: '/api/', items: apiSidebar }],
    },
  };
}

const en: Labels = {
  guide: 'Guide',
  api: 'API reference',
  changelog: 'Releases',
  groups: ['Introduction', 'Using the component', 'Output', 'Platform notes'],
  pages: {
    '': 'What is it?',
    'installation': 'Installation',
    'quick-start': 'Quick start',
    'props': 'Props',
    'methods': 'Ref methods',
    'toolbar': 'Toolbar',
    'events': 'Events',
    'export': 'Export formats',
    'stroke-data': 'Stroke data and replay',
    'platform-differences': 'iOS vs Android',
    'performance': 'Performance',
    'troubleshooting': 'Troubleshooting',
  },
};

const vi: Labels = {
  guide: 'Hướng dẫn',
  api: 'Tài liệu API',
  changelog: 'Các bản phát hành',
  groups: ['Giới thiệu', 'Sử dụng component', 'Xuất dữ liệu', 'Lưu ý theo nền tảng'],
  pages: {
    '': 'Tổng quan',
    'installation': 'Cài đặt',
    'quick-start': 'Bắt đầu nhanh',
    'props': 'Props',
    'methods': 'Phương thức qua ref',
    'toolbar': 'Toolbar',
    'events': 'Sự kiện',
    'export': 'Định dạng xuất',
    'stroke-data': 'Dữ liệu nét vẽ và replay',
    'platform-differences': 'iOS và Android',
    'performance': 'Hiệu năng',
    'troubleshooting': 'Khắc phục sự cố',
  },
};

const zh: Labels = {
  guide: '指南',
  api: 'API 参考',
  changelog: '版本发布',
  groups: ['入门', '使用组件', '导出', '平台说明'],
  pages: {
    '': '概览',
    'installation': '安装',
    'quick-start': '快速开始',
    'props': 'Props',
    'methods': 'Ref 方法',
    'toolbar': '工具栏',
    'events': '事件',
    'export': '导出格式',
    'stroke-data': '笔画数据与回放',
    'platform-differences': 'iOS 与 Android 差异',
    'performance': '性能',
    'troubleshooting': '故障排查',
  },
};

// SEO: locale metadata used for hreflang, og:locale and the preview image alt text.
const seoLocales = {
  root: {
    prefix: '',
    lang: 'en-US',
    og: 'en_US',
    imageAlt:
      'React Native Signature Ink: an emerald ink signature written above a dashed baseline, with a native toolbar',
  },
  vi: {
    prefix: 'vi/',
    lang: 'vi-VN',
    og: 'vi_VN',
    imageAlt:
      'React Native Signature Ink: chữ ký mực xanh ngọc lục bảo trên đường kẻ nét đứt, kèm toolbar native',
  },
  zh: {
    prefix: 'zh/',
    lang: 'zh-CN',
    og: 'zh_CN',
    imageAlt:
      'React Native Signature Ink：虚线基线上方的翡翠绿墨迹签名，下方是原生工具栏',
  },
} as const;
type SeoLocale = keyof typeof seoLocales;

function localeOf(page: string): SeoLocale {
  const first = page.split('/')[0];
  return first === 'vi' || first === 'zh' ? first : 'root';
}

/** `vi/guide/index.md` -> `vi/guide/`, `api/interfaces/StrokePoint.md` -> `api/interfaces/StrokePoint`. */
function pageUrl(page: string): string {
  return page.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '');
}

/** Description for generated TypeDoc pages, which have no frontmatter. */
function apiDescription(relativePath: string): string | undefined {
  const m = relativePath.match(/^api\/(?:(\w[\w-]*)\/)?([^/]+)\.md$/);
  if (!m) return undefined;
  const [, kind, name] = m;
  const lib = 'react-native-signature-ink';
  switch (kind) {
    case undefined:
      return `API reference for ${lib}: the SignatureInk component, its props, ref methods, event payloads and toolbar types, generated from the TypeScript source.`;
    case 'interfaces':
      return `API reference for the ${name} interface in ${lib}, listing every property with its type and description.`;
    case 'type-aliases':
      return `API reference for the ${name} type in ${lib}, with its full TypeScript definition and what each member means.`;
    case 'variables':
      return name === 'SignatureInk'
        ? `API reference for SignatureInk, the recommended native signature component of ${lib}, with its props and ref type.`
        : name === 'SignatureInkView'
          ? `API reference for SignatureInkView, the raw Fabric host component behind SignatureInk in ${lib}.`
          : `API reference for the ${name} constant in ${lib}, used to configure the built-in native toolbar.`;
    default:
      return undefined;
  }
}

export default defineConfig({
  title: 'React Native Signature Ink',
  description:
    'True-native signature capture for React Native: PencilKit on iOS, a velocity-Bezier renderer on Android, Fabric-first, with a native toolbar.',
  base,
  cleanUrls: true,
  lastUpdated: true,
  // Follow the system setting (light when unknown): the library's default look is dark ink on a light page.
  appearance: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    [
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: `${base}apple-touch-icon.png`,
      },
    ],
    ['meta', { name: 'theme-color', content: '#10B981' }],
    [
      'meta',
      {
        name: 'google-site-verification',
        content: 'tQKWpMESb7_XYCOMCID91lFgoQ4_dt3sqGoXzuRu-ZQ',
      },
    ],
  ],
  sitemap: {
    // VitePress 1.6 builds item URLs without `base`, so the hostname carries it.
    hostname: site,
    transformItems: (items) =>
      items.map((item) => {
        const en = item.links?.find((l) => l.lang === seoLocales.root.lang);
        return en
          ? { ...item, links: [...item.links!, { lang: 'x-default', url: en.url }] }
          : item;
      }),
  },
  transformPageData(pageData: PageData) {
    const description = apiDescription(pageData.relativePath);
    if (description && !pageData.frontmatter.description) {
      return {
        description,
        frontmatter: { ...pageData.frontmatter, description },
      };
    }
  },
  transformHead({ page, pageData, siteConfig, title, description }) {
    if (page === '404.md' || pageData.isNotFound) {
      return [['meta', { name: 'robots', content: 'noindex' }]];
    }
    const locale = localeOf(page);
    const key = locale === 'root' ? page : page.slice(locale.length + 1);
    const url = site + pageUrl(page);
    const exists = new Set(siteConfig.pages);
    const variants = (Object.keys(seoLocales) as SeoLocale[]).filter((l) =>
      exists.has(seoLocales[l].prefix + key)
    );
    const isHome = pageData.frontmatter.layout === 'home';
    const image = `${site}og.png`;
    const imageAlt = seoLocales[locale].imageAlt;

    const head: HeadConfig[] = [['link', { rel: 'canonical', href: url }]];
    if (variants.length > 1) {
      for (const l of variants) {
        head.push([
          'link',
          {
            rel: 'alternate',
            hreflang: seoLocales[l].lang,
            href: site + pageUrl(seoLocales[l].prefix + key),
          },
        ]);
      }
      if (variants.includes('root')) {
        head.push([
          'link',
          { rel: 'alternate', hreflang: 'x-default', href: site + pageUrl(key) },
        ]);
      }
    }
    const og: [string, string][] = [
      ['og:type', isHome ? 'website' : 'article'],
      ['og:site_name', 'React Native Signature Ink'],
      ['og:title', title],
      ['og:description', description],
      ['og:url', url],
      ['og:locale', seoLocales[locale].og],
      ...variants
        .filter((l) => l !== locale)
        .map((l): [string, string] => ['og:locale:alternate', seoLocales[l].og]),
      ['og:image', image],
      ['og:image:type', 'image/png'],
      ['og:image:width', '1200'],
      ['og:image:height', '630'],
      ['og:image:alt', imageAlt],
    ];
    for (const [property, content] of og) {
      head.push(['meta', { property, content }]);
    }
    const twitter: [string, string][] = [
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', title],
      ['twitter:description', description],
      ['twitter:image', image],
      ['twitter:image:alt', imageAlt],
    ];
    for (const [name, content] of twitter) {
      head.push(['meta', { name, content }]);
    }
    return head;
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: themeConfig('', en),
    },
    vi: {
      label: 'Tiếng Việt',
      lang: 'vi-VN',
      title: 'React Native Signature Ink',
      description:
        'Thư viện ký tên native cho React Native: PencilKit trên iOS, renderer velocity-Bezier trên Android, ưu tiên Fabric, có sẵn toolbar native.',
      themeConfig: {
        ...themeConfig('/vi', vi),
        outline: { level: [2, 3], label: 'Trên trang này' },
        docFooter: { prev: 'Trang trước', next: 'Trang sau' },
        lastUpdated: { text: 'Cập nhật lần cuối' },
        editLink: {
          pattern: `${repo}/edit/master/docs/:path`,
          text: 'Sửa trang này trên GitHub',
        },
        returnToTopLabel: 'Về đầu trang',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Giao diện',
        lightModeSwitchTitle: 'Chuyển sang giao diện sáng',
        darkModeSwitchTitle: 'Chuyển sang giao diện tối',
        langMenuLabel: 'Đổi ngôn ngữ',
        notFound: {
          title: 'KHÔNG TÌM THẤY TRANG',
          quote: 'Trang bạn tìm không tồn tại hoặc đã được chuyển đi.',
          linkText: 'Về trang chủ',
        },
        footer: { message: 'Phát hành theo giấy phép MIT.' },
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'React Native Signature Ink',
      description:
        'React Native 原生签名组件：iOS 使用 PencilKit，Android 使用速度感知的贝塞尔渲染器，Fabric 优先，自带原生工具栏。',
      themeConfig: {
        ...themeConfig('/zh', zh),
        outline: { level: [2, 3], label: '页面导航' },
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdated: { text: '最后更新于' },
        editLink: {
          pattern: `${repo}/edit/master/docs/:path`,
          text: '在 GitHub 上编辑此页',
        },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        langMenuLabel: '切换语言',
        notFound: {
          title: '页面未找到',
          quote: '你访问的页面不存在或已被移动。',
          linkText: '返回首页',
        },
        footer: { message: '基于 MIT 许可证发布。' },
      },
    },
  },
  themeConfig: {
    logo: '/logo.svg',
    socialLinks: [{ icon: 'github', link: repo }],
    search: {
      provider: 'local',
      options: {
        locales: {
          vi: {
            translations: {
              button: { buttonText: 'Tìm kiếm', buttonAriaLabel: 'Tìm kiếm' },
              modal: {
                displayDetails: 'Hiển thị chi tiết',
                resetButtonTitle: 'Xóa tìm kiếm',
                backButtonTitle: 'Đóng tìm kiếm',
                noResultsText: 'Không có kết quả cho',
                footer: {
                  selectText: 'chọn',
                  navigateText: 'di chuyển',
                  closeText: 'đóng',
                },
              },
            },
          },
          zh: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
              modal: {
                displayDetails: '显示详情',
                resetButtonTitle: '清除查询',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有找到相关结果',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
    editLink: {
      // Serialized into the client bundle, so it cannot use variables from this file. API pages
      // are generated from the doc comments in src.
      pattern: ({ filePath }) =>
        filePath.startsWith('api/')
          ? 'https://github.com/maitrungduc1410/react-native-signature-ink/tree/master/src'
          : `https://github.com/maitrungduc1410/react-native-signature-ink/edit/master/docs/${filePath}`,
      text: 'Edit this page on GitHub',
    },
    outline: { level: [2, 3] },
    footer: { message: 'Released under the MIT License.' },
  },
});
