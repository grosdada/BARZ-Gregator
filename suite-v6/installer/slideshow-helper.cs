using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

internal static class BarzSlideshow
{
    private const uint SwpNoActivate = 0x0010;
    private const uint SwpShowWindow = 0x0040;
    private const int GwlStyle = -16;
    private const int SsBitmap = 0x0e;
    private const int IntervalMs = 2500;

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect { public int Left, Top, Right, Bottom; }

    [StructLayout(LayoutKind.Sequential)]
    private struct Point { public int X, Y; }

    private delegate bool EnumChildProc(IntPtr window, IntPtr data);

    [DllImport("user32.dll")] private static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsWindowEnabled(IntPtr window);
    [DllImport("user32.dll")] private static extern IntPtr GetDlgItem(IntPtr parent, int id);
    [DllImport("user32.dll")] private static extern bool EnumChildWindows(IntPtr parent, EnumChildProc callback, IntPtr data);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr window, StringBuilder name, int capacity);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongW")] private static extern int GetWindowLong(IntPtr window, int index);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] private static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] private static extern bool ScreenToClient(IntPtr window, ref Point point);
    [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);

    private static string ClassName(IntPtr window)
    {
        StringBuilder name = new StringBuilder(64);
        GetClassName(window, name, name.Capacity);
        return name.ToString();
    }

    private static IntPtr FindBitmap(IntPtr parent)
    {
        IntPtr result = IntPtr.Zero;
        long area = 0;
        EnumChildWindows(parent, delegate(IntPtr window, IntPtr unused)
        {
            if (!string.Equals(ClassName(window), "Static", StringComparison.OrdinalIgnoreCase) ||
                (GetWindowLong(window, GwlStyle) & 0x0f) != SsBitmap) return true;
            Rect bounds;
            if (!GetWindowRect(window, out bounds)) return true;
            int width = bounds.Right - bounds.Left;
            int height = bounds.Bottom - bounds.Top;
            long candidate = (long)width * height;
            if (width >= 250 && height >= 80 && candidate > area)
            {
                result = window;
                area = candidate;
            }
            return true;
        }, IntPtr.Zero);
        return result;
    }

    private static IntPtr FindVisibleProgress(IntPtr parent)
    {
        IntPtr result = IntPtr.Zero;
        EnumChildWindows(parent, delegate(IntPtr window, IntPtr unused)
        {
            string name = ClassName(window);
            if (IsWindowVisible(window) && (string.Equals(name, "msctls_progress32", StringComparison.OrdinalIgnoreCase) ||
                name.IndexOf("ProgressBar", StringComparison.OrdinalIgnoreCase) >= 0))
            {
                result = window;
                return false;
            }
            return true;
        }, IntPtr.Zero);
        return result;
    }

    private static Rect ClientBounds(IntPtr parent, IntPtr child)
    {
        Rect screen;
        if (!GetWindowRect(child, out screen)) throw new InvalidOperationException("Control has no bounds");
        Point start = new Point { X = screen.Left, Y = screen.Top };
        ScreenToClient(parent, ref start);
        return new Rect { Left = start.X, Top = start.Y,
            Right = start.X + screen.Right - screen.Left,
            Bottom = start.Y + screen.Bottom - screen.Top };
    }

    private static void Place(IntPtr control, Rect bounds)
    {
        SetWindowPos(control, IntPtr.Zero, bounds.Left, bounds.Top,
            bounds.Right - bounds.Left, bounds.Bottom - bounds.Top, SwpNoActivate | SwpShowWindow);
    }

    private static void DrawSlide(IntPtr control, Bitmap source, int width, int height)
    {
        using (Graphics graphics = Graphics.FromHwnd(control))
        {
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.DrawImage(source, 0, 0, width, height);
        }
    }

    private static long ParseWindow(string value)
    {
        if (value.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
            return Convert.ToInt64(value.Substring(2), 16);
        return long.Parse(value);
    }

    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length < 3) return 2;
        string diagnostics = args.Length > 3 ? args[3] : null;
        try
        {
            IntPtr parent = new IntPtr(ParseWindow(args[0]));
            string directory = args[1];
            int count = int.Parse(args[2]);
            if (count < 2 || count > 200) return 0;
            for (int attempt = 0; attempt < 100 && IsWindow(parent); attempt++)
            {
                IntPtr control = FindBitmap(parent);
                if (control != IntPtr.Zero)
                {
                    Run(parent, control, directory, count, diagnostics);
                    return 0;
                }
                Thread.Sleep(100);
            }
            return 3;
        }
        catch (Exception error)
        {
            if (diagnostics != null) File.AppendAllText(diagnostics, error.ToString() + Environment.NewLine);
            return 1;
        }
    }

    private static void Run(IntPtr parent, IntPtr control, string directory, int count, string diagnostics)
    {
        Rect original = ClientBounds(parent, control);
        Bitmap current = null;
        bool expanded = false;
        int index = 2; // NSIS displays the first banner before starting this helper.
        DateTime nextSlide = DateTime.UtcNow.AddMilliseconds(IntervalMs);
        if (diagnostics != null) File.AppendAllText(diagnostics, "started " + parent + Environment.NewLine);
        try
        {
            while (IsWindow(parent) && IsWindow(control))
            {
                IntPtr progress = FindVisibleProgress(parent);
                IntPtr nextButton = GetDlgItem(parent, 1);
                bool installing = progress != IntPtr.Zero && (nextButton == IntPtr.Zero || !IsWindowEnabled(nextButton));
                if (diagnostics != null && current == null) File.AppendAllText(diagnostics,
                    "progress=" + progress + " next=" + nextButton + " installing=" + installing + Environment.NewLine);
                if (installing != expanded)
                {
                    if (installing)
                    {
                        Rect page;
                        Rect bar = ClientBounds(parent, progress);
                        GetClientRect(parent, out page);
                        int top = bar.Bottom + 38;
                        Rect large = new Rect { Left = 12, Top = top, Right = page.Right - 12, Bottom = page.Bottom - 12 };
                        if (large.Bottom - large.Top > 150) Place(control, large);
                    }
                    else Place(control, original);
                    expanded = installing;
                    nextSlide = DateTime.MinValue;
                }
                if (DateTime.UtcNow >= nextSlide)
                {
                    string prefix = installing ? "poster-" : "banner-";
                    string file = Path.Combine(directory, prefix + index + ".bmp");
                    if (!File.Exists(file)) break;
                    if (current != null) current.Dispose();
                    current = new Bitmap(file);
                    if (diagnostics != null) File.AppendAllText(diagnostics, prefix + index + Environment.NewLine);
                    index = index >= count ? 1 : index + 1;
                    nextSlide = DateTime.UtcNow.AddMilliseconds(IntervalMs);
                }
                if (current != null)
                {
                    Rect bounds = ClientBounds(parent, control);
                    int width = bounds.Right - bounds.Left;
                    int height = bounds.Bottom - bounds.Top;
                    if (width > 0 && height > 0) DrawSlide(control, current, width, height);
                }
                Thread.Sleep(200);
            }
        }
        finally
        {
            if (current != null) current.Dispose();
        }
    }
}
