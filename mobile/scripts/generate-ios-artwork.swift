import AppKit
import CoreGraphics
import Foundation

let sourceSize: CGFloat = 1024.0
let outline: [CGPoint] = [
    CGPoint(x: 693.0, y: 156.0),
    CGPoint(x: 686.0, y: 157.0),
    CGPoint(x: 679.0, y: 159.0),
    CGPoint(x: 672.0, y: 162.0),
    CGPoint(x: 665.0, y: 166.0),
    CGPoint(x: 658.0, y: 170.0),
    CGPoint(x: 651.0, y: 177.0),
    CGPoint(x: 644.0, y: 184.0),
    CGPoint(x: 638.0, y: 191.0),
    CGPoint(x: 631.0, y: 198.0),
    CGPoint(x: 625.0, y: 205.0),
    CGPoint(x: 618.0, y: 212.0),
    CGPoint(x: 611.0, y: 219.0),
    CGPoint(x: 604.0, y: 226.0),
    CGPoint(x: 598.0, y: 233.0),
    CGPoint(x: 591.0, y: 240.0),
    CGPoint(x: 585.0, y: 247.0),
    CGPoint(x: 578.0, y: 254.0),
    CGPoint(x: 571.0, y: 261.0),
    CGPoint(x: 565.0, y: 268.0),
    CGPoint(x: 558.0, y: 275.0),
    CGPoint(x: 551.0, y: 282.0),
    CGPoint(x: 545.0, y: 289.0),
    CGPoint(x: 538.0, y: 296.0),
    CGPoint(x: 531.0, y: 303.0),
    CGPoint(x: 525.0, y: 310.0),
    CGPoint(x: 518.0, y: 317.0),
    CGPoint(x: 512.0, y: 324.0),
    CGPoint(x: 505.0, y: 331.0),
    CGPoint(x: 498.0, y: 338.0),
    CGPoint(x: 492.0, y: 345.0),
    CGPoint(x: 485.0, y: 352.0),
    CGPoint(x: 479.0, y: 359.0),
    CGPoint(x: 472.0, y: 366.0),
    CGPoint(x: 465.0, y: 373.0),
    CGPoint(x: 459.0, y: 380.0),
    CGPoint(x: 452.0, y: 387.0),
    CGPoint(x: 446.0, y: 394.0),
    CGPoint(x: 439.0, y: 401.0),
    CGPoint(x: 433.0, y: 408.0),
    CGPoint(x: 426.0, y: 415.0),
    CGPoint(x: 419.0, y: 422.0),
    CGPoint(x: 413.0, y: 429.0),
    CGPoint(x: 406.0, y: 436.0),
    CGPoint(x: 400.0, y: 443.0),
    CGPoint(x: 393.0, y: 450.0),
    CGPoint(x: 386.0, y: 457.0),
    CGPoint(x: 380.0, y: 464.0),
    CGPoint(x: 373.0, y: 471.0),
    CGPoint(x: 367.0, y: 478.0),
    CGPoint(x: 360.0, y: 485.0),
    CGPoint(x: 353.0, y: 492.0),
    CGPoint(x: 347.0, y: 499.0),
    CGPoint(x: 340.0, y: 506.0),
    CGPoint(x: 333.0, y: 513.0),
    CGPoint(x: 327.0, y: 520.0),
    CGPoint(x: 320.0, y: 527.0),
    CGPoint(x: 314.0, y: 534.0),
    CGPoint(x: 307.0, y: 541.0),
    CGPoint(x: 300.0, y: 548.0),
    CGPoint(x: 294.0, y: 555.0),
    CGPoint(x: 287.0, y: 562.0),
    CGPoint(x: 280.0, y: 569.0),
    CGPoint(x: 276.0, y: 576.0),
    CGPoint(x: 272.0, y: 583.0),
    CGPoint(x: 269.0, y: 590.0),
    CGPoint(x: 266.0, y: 597.0),
    CGPoint(x: 265.0, y: 604.0),
    CGPoint(x: 264.0, y: 611.0),
    CGPoint(x: 263.0, y: 618.0),
    CGPoint(x: 263.0, y: 625.0),
    CGPoint(x: 264.0, y: 632.0),
    CGPoint(x: 266.0, y: 639.0),
    CGPoint(x: 268.0, y: 646.0),
    CGPoint(x: 271.0, y: 653.0),
    CGPoint(x: 275.0, y: 660.0),
    CGPoint(x: 279.0, y: 667.0),
    CGPoint(x: 285.0, y: 674.0),
    CGPoint(x: 292.0, y: 680.0),
    CGPoint(x: 299.0, y: 686.0),
    CGPoint(x: 306.0, y: 690.0),
    CGPoint(x: 313.0, y: 693.0),
    CGPoint(x: 320.0, y: 696.0),
    CGPoint(x: 327.0, y: 698.0),
    CGPoint(x: 334.0, y: 699.0),
    CGPoint(x: 341.0, y: 700.0),
    CGPoint(x: 348.0, y: 700.0),
    CGPoint(x: 355.0, y: 700.0),
    CGPoint(x: 362.0, y: 700.0),
    CGPoint(x: 369.0, y: 700.0),
    CGPoint(x: 376.0, y: 700.0),
    CGPoint(x: 383.0, y: 700.0),
    CGPoint(x: 390.0, y: 700.0),
    CGPoint(x: 397.0, y: 700.0),
    CGPoint(x: 404.0, y: 700.0),
    CGPoint(x: 411.0, y: 700.0),
    CGPoint(x: 418.0, y: 700.0),
    CGPoint(x: 425.0, y: 700.0),
    CGPoint(x: 432.0, y: 700.0),
    CGPoint(x: 439.0, y: 700.0),
    CGPoint(x: 446.0, y: 700.0),
    CGPoint(x: 453.0, y: 700.0),
    CGPoint(x: 460.0, y: 700.0),
    CGPoint(x: 467.0, y: 700.0),
    CGPoint(x: 474.0, y: 700.0),
    CGPoint(x: 481.0, y: 700.0),
    CGPoint(x: 488.0, y: 700.0),
    CGPoint(x: 495.0, y: 700.0),
    CGPoint(x: 502.0, y: 700.0),
    CGPoint(x: 509.0, y: 700.0),
    CGPoint(x: 516.0, y: 700.0),
    CGPoint(x: 523.0, y: 700.0),
    CGPoint(x: 530.0, y: 700.0),
    CGPoint(x: 537.0, y: 700.0),
    CGPoint(x: 544.0, y: 700.0),
    CGPoint(x: 551.0, y: 700.0),
    CGPoint(x: 558.0, y: 700.0),
    CGPoint(x: 565.0, y: 700.0),
    CGPoint(x: 572.0, y: 700.0),
    CGPoint(x: 579.0, y: 700.0),
    CGPoint(x: 586.0, y: 700.0),
    CGPoint(x: 593.0, y: 700.0),
    CGPoint(x: 593.0, y: 706.0),
    CGPoint(x: 591.0, y: 713.0),
    CGPoint(x: 589.0, y: 720.0),
    CGPoint(x: 587.0, y: 727.0),
    CGPoint(x: 585.0, y: 734.0),
    CGPoint(x: 583.0, y: 741.0),
    CGPoint(x: 581.0, y: 748.0),
    CGPoint(x: 579.0, y: 755.0),
    CGPoint(x: 577.0, y: 762.0),
    CGPoint(x: 574.0, y: 769.0),
    CGPoint(x: 572.0, y: 776.0),
    CGPoint(x: 570.0, y: 783.0),
    CGPoint(x: 568.0, y: 790.0),
    CGPoint(x: 566.0, y: 797.0),
    CGPoint(x: 564.0, y: 804.0),
    CGPoint(x: 562.0, y: 811.0),
    CGPoint(x: 560.0, y: 818.0),
    CGPoint(x: 557.0, y: 825.0),
    CGPoint(x: 555.0, y: 832.0),
    CGPoint(x: 553.0, y: 839.0),
    CGPoint(x: 551.0, y: 846.0),
    CGPoint(x: 549.0, y: 853.0),
    CGPoint(x: 547.0, y: 860.0),
    CGPoint(x: 545.0, y: 867.0),
    CGPoint(x: 543.0, y: 874.0),
    CGPoint(x: 540.0, y: 881.0),
    CGPoint(x: 538.0, y: 888.0),
    CGPoint(x: 536.0, y: 895.0),
    CGPoint(x: 534.0, y: 902.0),
    CGPoint(x: 532.0, y: 909.0),
    CGPoint(x: 530.0, y: 916.0),
    CGPoint(x: 528.0, y: 923.0),
    CGPoint(x: 526.0, y: 930.0),
    CGPoint(x: 524.0, y: 937.0),
    CGPoint(x: 523.0, y: 944.0),
    CGPoint(x: 523.0, y: 951.0),
    CGPoint(x: 524.0, y: 958.0),
    CGPoint(x: 526.0, y: 965.0),
    CGPoint(x: 528.0, y: 972.0),
    CGPoint(x: 532.0, y: 979.0),
    CGPoint(x: 536.0, y: 986.0),
    CGPoint(x: 542.0, y: 993.0),
    CGPoint(x: 549.0, y: 999.0),
    CGPoint(x: 556.0, y: 1004.0),
    CGPoint(x: 563.0, y: 1007.0),
    CGPoint(x: 570.0, y: 1010.0),
    CGPoint(x: 577.0, y: 1012.0),
    CGPoint(x: 584.0, y: 1012.0),
    CGPoint(x: 591.0, y: 1012.0),
    CGPoint(x: 598.0, y: 1012.0),
    CGPoint(x: 605.0, y: 1010.0),
    CGPoint(x: 612.0, y: 1008.0),
    CGPoint(x: 619.0, y: 1005.0),
    CGPoint(x: 626.0, y: 1000.0),
    CGPoint(x: 633.0, y: 995.0),
    CGPoint(x: 639.0, y: 988.0),
    CGPoint(x: 646.0, y: 981.0),
    CGPoint(x: 652.0, y: 974.0),
    CGPoint(x: 659.0, y: 967.0),
    CGPoint(x: 665.0, y: 960.0),
    CGPoint(x: 672.0, y: 953.0),
    CGPoint(x: 678.0, y: 946.0),
    CGPoint(x: 685.0, y: 939.0),
    CGPoint(x: 691.0, y: 932.0),
    CGPoint(x: 697.0, y: 925.0),
    CGPoint(x: 704.0, y: 918.0),
    CGPoint(x: 710.0, y: 911.0),
    CGPoint(x: 717.0, y: 904.0),
    CGPoint(x: 723.0, y: 897.0),
    CGPoint(x: 730.0, y: 890.0),
    CGPoint(x: 736.0, y: 883.0),
    CGPoint(x: 743.0, y: 876.0),
    CGPoint(x: 749.0, y: 869.0),
    CGPoint(x: 756.0, y: 862.0),
    CGPoint(x: 762.0, y: 855.0),
    CGPoint(x: 769.0, y: 848.0),
    CGPoint(x: 775.0, y: 841.0),
    CGPoint(x: 782.0, y: 834.0),
    CGPoint(x: 788.0, y: 827.0),
    CGPoint(x: 795.0, y: 820.0),
    CGPoint(x: 801.0, y: 813.0),
    CGPoint(x: 807.0, y: 806.0),
    CGPoint(x: 814.0, y: 799.0),
    CGPoint(x: 820.0, y: 792.0),
    CGPoint(x: 827.0, y: 785.0),
    CGPoint(x: 833.0, y: 778.0),
    CGPoint(x: 840.0, y: 771.0),
    CGPoint(x: 846.0, y: 764.0),
    CGPoint(x: 853.0, y: 757.0),
    CGPoint(x: 859.0, y: 750.0),
    CGPoint(x: 866.0, y: 743.0),
    CGPoint(x: 872.0, y: 736.0),
    CGPoint(x: 879.0, y: 729.0),
    CGPoint(x: 885.0, y: 722.0),
    CGPoint(x: 892.0, y: 715.0),
    CGPoint(x: 898.0, y: 708.0),
    CGPoint(x: 904.0, y: 701.0),
    CGPoint(x: 911.0, y: 694.0),
    CGPoint(x: 917.0, y: 687.0),
    CGPoint(x: 924.0, y: 680.0),
    CGPoint(x: 930.0, y: 673.0),
    CGPoint(x: 937.0, y: 666.0),
    CGPoint(x: 943.0, y: 659.0),
    CGPoint(x: 950.0, y: 652.0),
    CGPoint(x: 956.0, y: 645.0),
    CGPoint(x: 963.0, y: 638.0),
    CGPoint(x: 969.0, y: 631.0),
    CGPoint(x: 976.0, y: 624.0),
    CGPoint(x: 982.0, y: 617.0),
    CGPoint(x: 989.0, y: 610.0),
    CGPoint(x: 995.0, y: 603.0),
    CGPoint(x: 1002.0, y: 596.0),
    CGPoint(x: 1008.0, y: 589.0),
    CGPoint(x: 1014.0, y: 582.0),
    CGPoint(x: 1018.0, y: 575.0),
    CGPoint(x: 1021.0, y: 568.0),
    CGPoint(x: 1024.0, y: 561.0),
    CGPoint(x: 1026.0, y: 554.0),
    CGPoint(x: 1027.0, y: 547.0),
    CGPoint(x: 1028.0, y: 540.0),
    CGPoint(x: 1027.0, y: 533.0),
    CGPoint(x: 1027.0, y: 526.0),
    CGPoint(x: 1026.0, y: 519.0),
    CGPoint(x: 1024.0, y: 512.0),
    CGPoint(x: 1021.0, y: 505.0),
    CGPoint(x: 1018.0, y: 498.0),
    CGPoint(x: 1014.0, y: 491.0),
    CGPoint(x: 1009.0, y: 484.0),
    CGPoint(x: 1002.0, y: 477.0),
    CGPoint(x: 995.0, y: 471.0),
    CGPoint(x: 988.0, y: 466.0),
    CGPoint(x: 981.0, y: 462.0),
    CGPoint(x: 974.0, y: 459.0),
    CGPoint(x: 967.0, y: 457.0),
    CGPoint(x: 960.0, y: 455.0),
    CGPoint(x: 953.0, y: 454.0),
    CGPoint(x: 946.0, y: 454.0),
    CGPoint(x: 939.0, y: 454.0),
    CGPoint(x: 932.0, y: 454.0),
    CGPoint(x: 925.0, y: 454.0),
    CGPoint(x: 918.0, y: 454.0),
    CGPoint(x: 911.0, y: 454.0),
    CGPoint(x: 904.0, y: 454.0),
    CGPoint(x: 897.0, y: 454.0),
    CGPoint(x: 890.0, y: 454.0),
    CGPoint(x: 883.0, y: 454.0),
    CGPoint(x: 876.0, y: 454.0),
    CGPoint(x: 869.0, y: 454.0),
    CGPoint(x: 862.0, y: 454.0),
    CGPoint(x: 855.0, y: 454.0),
    CGPoint(x: 848.0, y: 454.0),
    CGPoint(x: 841.0, y: 454.0),
    CGPoint(x: 834.0, y: 454.0),
    CGPoint(x: 827.0, y: 454.0),
    CGPoint(x: 820.0, y: 454.0),
    CGPoint(x: 813.0, y: 454.0),
    CGPoint(x: 806.0, y: 454.0),
    CGPoint(x: 799.0, y: 454.0),
    CGPoint(x: 792.0, y: 454.0),
    CGPoint(x: 785.0, y: 454.0),
    CGPoint(x: 778.0, y: 454.0),
    CGPoint(x: 771.0, y: 454.0),
    CGPoint(x: 764.0, y: 454.0),
    CGPoint(x: 757.0, y: 454.0),
    CGPoint(x: 750.0, y: 454.0),
    CGPoint(x: 743.0, y: 454.0),
    CGPoint(x: 736.0, y: 454.0),
    CGPoint(x: 729.0, y: 454.0),
    CGPoint(x: 722.0, y: 454.0),
    CGPoint(x: 715.0, y: 454.0),
    CGPoint(x: 708.0, y: 454.0),
    CGPoint(x: 701.0, y: 454.0),
    CGPoint(x: 694.0, y: 453.0),
    CGPoint(x: 696.0, y: 446.0),
    CGPoint(x: 698.0, y: 439.0),
    CGPoint(x: 700.0, y: 432.0),
    CGPoint(x: 702.0, y: 425.0),
    CGPoint(x: 704.0, y: 418.0),
    CGPoint(x: 707.0, y: 411.0),
    CGPoint(x: 709.0, y: 404.0),
    CGPoint(x: 711.0, y: 397.0),
    CGPoint(x: 713.0, y: 390.0),
    CGPoint(x: 716.0, y: 383.0),
    CGPoint(x: 718.0, y: 376.0),
    CGPoint(x: 720.0, y: 369.0),
    CGPoint(x: 722.0, y: 362.0),
    CGPoint(x: 724.0, y: 355.0),
    CGPoint(x: 727.0, y: 348.0),
    CGPoint(x: 729.0, y: 341.0),
    CGPoint(x: 731.0, y: 334.0),
    CGPoint(x: 733.0, y: 327.0),
    CGPoint(x: 736.0, y: 320.0),
    CGPoint(x: 738.0, y: 313.0),
    CGPoint(x: 740.0, y: 306.0),
    CGPoint(x: 742.0, y: 299.0),
    CGPoint(x: 744.0, y: 292.0),
    CGPoint(x: 746.0, y: 285.0),
    CGPoint(x: 749.0, y: 278.0),
    CGPoint(x: 751.0, y: 271.0),
    CGPoint(x: 753.0, y: 264.0),
    CGPoint(x: 755.0, y: 257.0),
    CGPoint(x: 757.0, y: 250.0),
    CGPoint(x: 759.0, y: 243.0),
    CGPoint(x: 761.0, y: 236.0),
    CGPoint(x: 762.0, y: 229.0),
    CGPoint(x: 763.0, y: 222.0),
    CGPoint(x: 762.0, y: 215.0),
    CGPoint(x: 761.0, y: 208.0),
    CGPoint(x: 760.0, y: 201.0),
    CGPoint(x: 757.0, y: 194.0),
    CGPoint(x: 753.0, y: 187.0),
    CGPoint(x: 748.0, y: 180.0),
    CGPoint(x: 742.0, y: 173.0),
    CGPoint(x: 735.0, y: 168.0),
    CGPoint(x: 728.0, y: 163.0),
    CGPoint(x: 721.0, y: 160.0),
    CGPoint(x: 714.0, y: 158.0),
    CGPoint(x: 707.0, y: 157.0),
    CGPoint(x: 700.0, y: 156.0)
]

func makePath(canvasSize: CGFloat, sourceCanvasSize: CGFloat) -> CGPath {
    let scale = sourceCanvasSize / sourceSize
    let offset = (canvasSize - sourceCanvasSize) / 2.0
    let path = CGMutablePath()
    guard let first = outline.first else { return path }
    path.move(to: CGPoint(x: offset + first.x * scale, y: offset + first.y * scale))
    for point in outline.dropFirst() {
        path.addLine(to: CGPoint(x: offset + point.x * scale, y: offset + point.y * scale))
    }
    path.closeSubpath()
    return path
}

func renderLogo(canvasSize: Int, sourceCanvasSize: CGFloat, output: URL) throws {
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: canvasSize,
        pixelsHigh: canvasSize,
        bitsPerSample: 8,
        samplesPerPixel: 3,
        hasAlpha: false,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 24
    ) else {
        throw NSError(domain: "BoltShareArtwork", code: 1)
    }

    NSGraphicsContext.saveGraphicsState()
    guard let graphics = NSGraphicsContext(bitmapImageRep: bitmap) else {
        throw NSError(domain: "BoltShareArtwork", code: 2)
    }
    NSGraphicsContext.current = graphics
    let context = graphics.cgContext
    let size = CGFloat(canvasSize)
    context.setFillColor(NSColor.black.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: size, height: size))

    // Core Graphics uses a bottom-left origin. Flip so the traced artwork preserves
    // the exact visual orientation of the supplied 1024 x 1024 source image.
    context.translateBy(x: 0, y: size)
    context.scaleBy(x: 1, y: -1)

    let path = makePath(canvasSize: size, sourceCanvasSize: sourceCanvasSize)

    context.saveGState()
    context.setShadow(
        offset: CGSize(width: 0, height: sourceCanvasSize * 0.006),
        blur: sourceCanvasSize * 0.018,
        color: NSColor(calibratedRed: 1.0, green: 0.73, blue: 0.0, alpha: 0.24).cgColor
    )
    context.addPath(path)
    context.setFillColor(NSColor(calibratedRed: 1.0, green: 0.77, blue: 0.02, alpha: 1.0).cgColor)
    context.fillPath()
    context.restoreGState()

    context.saveGState()
    context.addPath(path)
    context.clip()

    let colors = [
        NSColor(calibratedRed: 1.0, green: 0.84, blue: 0.13, alpha: 1.0).cgColor,
        NSColor(calibratedRed: 1.0, green: 0.79, blue: 0.04, alpha: 1.0).cgColor,
        NSColor(calibratedRed: 1.0, green: 0.69, blue: 0.0, alpha: 1.0).cgColor,
    ] as CFArray
    let locations: [CGFloat] = [0.0, 0.55, 1.0]
    guard let gradient = CGGradient(
        colorsSpace: CGColorSpaceCreateDeviceRGB(),
        colors: colors,
        locations: locations
    ) else {
        throw NSError(domain: "BoltShareArtwork", code: 3)
    }
    context.drawLinearGradient(
        gradient,
        start: CGPoint(x: size * 0.25, y: size * 0.12),
        end: CGPoint(x: size * 0.78, y: size * 0.92),
        options: []
    )

    let highlightColors = [
        NSColor(calibratedWhite: 1.0, alpha: 0.15).cgColor,
        NSColor(calibratedWhite: 1.0, alpha: 0.0).cgColor,
    ] as CFArray
    let highlightLocations: [CGFloat] = [0.0, 1.0]
    if let highlight = CGGradient(
        colorsSpace: CGColorSpaceCreateDeviceRGB(),
        colors: highlightColors,
        locations: highlightLocations
    ) {
        context.drawRadialGradient(
            highlight,
            startCenter: CGPoint(x: size * 0.48, y: size * 0.44),
            startRadius: 0,
            endCenter: CGPoint(x: size * 0.48, y: size * 0.44),
            endRadius: sourceCanvasSize * 0.46,
            options: []
        )
    }
    context.restoreGState()
    NSGraphicsContext.restoreGraphicsState()

    guard let data = bitmap.representation(using: .png, properties: [.compressionFactor: 1.0]) else {
        throw NSError(domain: "BoltShareArtwork", code: 4)
    }
    try FileManager.default.createDirectory(
        at: output.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    try data.write(to: output, options: .atomic)
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
try renderLogo(
    canvasSize: 1024,
    sourceCanvasSize: 1024,
    output: root.appendingPathComponent("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
)

let splashTargets = [
    "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
    "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png",
    "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png",
]
for target in splashTargets {
    try renderLogo(
        canvasSize: 2732,
        sourceCanvasSize: 1100,
        output: root.appendingPathComponent(target)
    )
}

print("Generated BoltShare iOS icon and launch artwork from the approved logo outline.")
