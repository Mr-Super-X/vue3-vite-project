<template>
  <div class="dashboard">
    <h1>{{ $t('menu.dashboard') }}</h1>
    <el-row :gutter="16">
      <el-col :span="8"><el-card>用户总数：128</el-card></el-col>
      <el-col :span="8"><el-card>在线用户：12</el-card></el-col>
      <el-col :span="8"><el-card>今日访问：256</el-card></el-col>
    </el-row>
  </div>
</template>
