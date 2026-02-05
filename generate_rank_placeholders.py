#!/usr/bin/env python3
"""
Gera placeholders PNG 512x512 para os ranks enquanto os assets finais não são adicionados.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Configuração
SIZE = (512, 512)
OUTPUT_DIR = "public/images/ranks"
TIERS = ["rookie", "veteran", "elite", "pro", "master", "grandmaster", "legendary"]
MATERIALS = ["bronze", "silver", "gold"]

# Cores por material
COLORS = {
    "bronze": "#CD7F32",
    "silver": "#C0C0C0", 
    "gold": "#FFD700"
}

# Garantir que os diretórios existem
for tier in TIERS:
    os.makedirs(f"{OUTPUT_DIR}/{tier}", exist_ok=True)

# Gerar placeholders
for tier in TIERS:
    for material in MATERIALS:
        # Criar imagem com fundo transparente
        img = Image.new('RGBA', SIZE, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Círculo de fundo com cor do material
        color = COLORS[material]
        circle_center = (SIZE[0] // 2, SIZE[1] // 2)
        circle_radius = 200
        draw.ellipse(
            [circle_center[0] - circle_radius, circle_center[1] - circle_radius,
             circle_center[0] + circle_radius, circle_center[1] + circle_radius],
            fill=color + "CC"  # 80% opacidade
        )
        
        # Texto
        try:
            font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
            font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Desenhar tier (topo)
        tier_text = tier.upper()
        tier_bbox = draw.textbbox((0, 0), tier_text, font=font_large)
        tier_width = tier_bbox[2] - tier_bbox[0]
        tier_x = (SIZE[0] - tier_width) // 2
        tier_y = SIZE[1] // 2 - 60
        draw.text((tier_x, tier_y), tier_text, fill="white", font=font_large)
        
        # Desenhar material (baixo)
        material_text = material.capitalize()
        material_bbox = draw.textbbox((0, 0), material_text, font=font_small)
        material_width = material_bbox[2] - material_bbox[0]
        material_x = (SIZE[0] - material_width) // 2
        material_y = SIZE[1] // 2 + 20
        draw.text((material_x, material_y), material_text, fill="white", font=font_small)
        
        # Salvar
        output_path = f"{OUTPUT_DIR}/{tier}/{tier}_{material}.png"
        img.save(output_path)
        print(f"✓ {output_path}")

print(f"\n✅ {len(TIERS) * len(MATERIALS)} placeholders criados!")
print("\nSubstitua depois por assets finais 512x512px com design profissional.")
