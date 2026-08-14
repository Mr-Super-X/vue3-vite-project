<script setup lang="ts">
// 首页底部：全宽色块 + 横向链接矩阵 + 版权信息
// 规格：源自 MeaXure 1920 artboard；上块 (links) y=994..1216 / 下块 (copyright) y=1216..1288
import { FOOTER_LINKS, FOOTER_COPYRIGHT, FOOTER_BEIAN } from '@/modules/home/config/footer'

// BEM 工具由 unplugin-auto-import 自动注入，无须显式 import
const bem = createNamespace('home-footer')
</script>

<template>
  <footer :class="bem.b()">
    <section :class="bem.e('links')">
      <div :class="bem.e('links-inner')">
        <h4 :class="bem.e('group-title')">系统链接</h4>
        <ul :class="bem.e('list')">
          <li v-for="(link, li) in FOOTER_LINKS" :key="li" :class="bem.e('item')">
            <a :href="link.href" target="_blank" rel="noopener">{{ link.label }}</a>
          </li>
        </ul>
      </div>
    </section>
    <section :class="bem.e('copyright')">
      <p :class="bem.e('line')">{{ FOOTER_COPYRIGHT }}</p>
      <p :class="bem.e('line')">{{ FOOTER_BEIAN }}</p>
    </section>
  </footer>
</template>

<style lang="scss">
.#{$BEM_PREFIX}-home-footer {
  color: #666;
  font-size: 12px;

  &__links {
    background: #f4f5f5;
    box-shadow:
      0 -1px 0 0 #e8eaeb,
      0 1px 0 0 #e8eaeb;
    padding: 30px 0 28px;
  }

  &__links-inner {
    max-width: var(--portal-max-width);
    margin: 0 auto;
    padding: 8px 20px 8px 24px;
    background: #eeefef;
    box-shadow:
      0 -1px 0 0 #e8eaeb,
      0 1px 0 0 #e8eaeb;
  }

  &__group-title {
    margin: 0 0 22px;
    font-size: 14px;
    font-weight: 700;
    color: #0d1c28;
    letter-spacing: 0.93px;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    row-gap: 16px;
    column-gap: 33px;
  }

  &__item {
    a {
      color: #45484b;
      font-size: 12px;
      text-decoration: none;
      letter-spacing: 0.8px;
      transition: color 0.2s;

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }

  &__copyright {
    background: #eeefef;
    box-shadow: 0 1px 0 0 #000;
    padding: 19px 16px 18px;
    text-align: center;
  }

  &__line {
    margin: 0;
    line-height: 17px;
    color: #666;
    font-size: 12px;
  }
}
</style>
