#!/usr/bin/env bash

set -euo pipefail

usage() {
	cat <<'EOF'
Usage:
	spread.bash <input_image> <cols> <rows> [output_dir] [prefix]

Arguments:
	input_image  Path to source image
	cols         Number of columns to split into (integer > 0)
	rows         Number of rows to split into (integer > 0)
	output_dir   Optional output directory (default: ./spread_output)
	prefix       Optional file prefix (default: chunk)

Examples:
	spread.bash ./sheet.png 8 8
	spread.bash ./sheet.png 4 2 ./out tile
EOF
}

is_positive_int() {
	case "$1" in
		''|*[!0-9]*) return 1 ;;
		0) return 1 ;;
		*) return 0 ;;
	esac
}

if [ "$#" -lt 3 ] || [ "$#" -gt 5 ]; then
	usage
	exit 1
fi

input_image="$1"
cols="$2"
rows="$3"
output_dir="${4:-./spread_output}"
prefix="${5:-chunk}"

if [ ! -f "$input_image" ]; then
	echo "Error: input image not found: $input_image" >&2
	exit 1
fi

if ! is_positive_int "$cols"; then
	echo "Error: cols must be an integer > 0" >&2
	exit 1
fi

if ! is_positive_int "$rows"; then
	echo "Error: rows must be an integer > 0" >&2
	exit 1
fi

identify_cmd=''
convert_cmd=''

if command -v magick >/dev/null 2>&1; then
	identify_cmd='magick identify'
	convert_cmd='magick convert'
elif command -v identify >/dev/null 2>&1 && command -v convert >/dev/null 2>&1; then
	identify_cmd='identify'
	convert_cmd='convert'
else
	echo "Error: ImageMagick is required (magick or identify/convert)." >&2
	exit 1
fi

dimensions="$(eval "$identify_cmd -format '%w %h' \"$input_image\"")"
img_w="${dimensions%% *}"
img_h="${dimensions##* }"

if [ "$img_w" -lt "$cols" ] || [ "$img_h" -lt "$rows" ]; then
	echo "Error: image is too small for requested grid (${img_w}x${img_h} vs ${cols}x${rows})." >&2
	exit 1
fi

mkdir -p "$output_dir"

base_w=$((img_w / cols))
base_h=$((img_h / rows))

if [ $((img_w % cols)) -ne 0 ] || [ $((img_h % rows)) -ne 0 ]; then
	echo "Warning: image size is not evenly divisible by grid; last row/column chunks will absorb remainder." >&2
fi

ext="${input_image##*.}"
if [ "$ext" = "$input_image" ]; then
	ext='png'
fi

for ((r = 0; r < rows; r += 1)); do
	y=$((r * base_h))

	if [ "$r" -eq $((rows - 1)) ]; then
		chunk_h=$((img_h - y))
	else
		chunk_h="$base_h"
	fi

	for ((c = 0; c < cols; c += 1)); do
		x=$((c * base_w))

		if [ "$c" -eq $((cols - 1)) ]; then
			chunk_w=$((img_w - x))
		else
			chunk_w="$base_w"
		fi

		out_file="${output_dir}/${prefix}_r${r}_c${c}.${ext}"
		eval "$convert_cmd \"$input_image\" -crop ${chunk_w}x${chunk_h}+${x}+${y} +repage \"$out_file\""
	done
done

echo "Done: created $((rows * cols)) chunks in $output_dir"

