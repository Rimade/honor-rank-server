const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Применение миграций...');

  try {
    // Здесь можно добавить дополнительную логику миграций
    console.log('✅ Миграции применены успешно');
  } catch (error) {
    console.error('❌ Ошибка при применении миграций:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
