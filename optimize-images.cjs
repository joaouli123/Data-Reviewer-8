#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

async function optimizeImages() {
  console.log('🖼️  Iniciando otimização de imagens...\n');

  const directories = [
    './client/public',
    './src/assets',
    './attached_assets'
  ];

  let totalBefore = 0;
  let totalAfter = 0;

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      console.log(`⏭️  Pulando ${dir} (não existe)\n`);
      continue;
    }

    console.log(`📁 Otimizando imagens em: ${dir}`);
    
    try {
      const files = glob.sync(`${dir}/*.{jpg,jpeg,png}`, { nodir: true });

      if (files.length === 0) {
        console.log('   Nenhuma imagem encontrada');
        console.log('');
        continue;
      }

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const stat = fs.statSync(file);
        const sizeBefore = stat.size;

        try {
          if (ext === '.png') {
            await sharp(file)
              .png({ quality: 80, compressionLevel: 9 })
              .toFile(file + '.tmp');
          } else if (['.jpg', '.jpeg'].includes(ext)) {
            await sharp(file)
              .jpeg({ quality: 75, mozjpeg: true })
              .toFile(file + '.tmp');
          }

          const sizeAfter = fs.statSync(file + '.tmp').size;
          
          if (sizeAfter < sizeBefore) {
            fs.renameSync(file + '.tmp', file);
            const saved = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(1);
            console.log(`   ✅ ${path.basename(file)} - ${(sizeBefore/1024).toFixed(1)}KB → ${(sizeAfter/1024).toFixed(1)}KB (${saved}%)`);
            totalBefore += sizeBefore;
            totalAfter += sizeAfter;
          } else {
            fs.unlinkSync(file + '.tmp');
            console.log(`   ⏭️  ${path.basename(file)} - já otimizada`);
          }
        } catch (err) {
          if (fs.existsSync(file + '.tmp')) fs.unlinkSync(file + '.tmp');
          console.log(`   ⚠️  ${path.basename(file)} - erro: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`⚠️  Erro ao processar ${dir}:`, err.message);
    }
    
    console.log('');
  }

  if (totalBefore > 0) {
    const totalSaved = ((totalBefore - totalAfter) / totalBefore * 100).toFixed(1);
    console.log(`✨ Otimização completa!`);
    console.log(`📊 Total: ${(totalBefore/1024).toFixed(2)}MB → ${(totalAfter/1024).toFixed(2)}MB (${totalSaved}% redução)`);
  } else {
    console.log('✨ Otimização completa! Nenhuma imagem para otimizar.');
  }
}

optimizeImages().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
