import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

function Toaster(props: ToasterProps) {
  return <Sonner position='top-center' richColors duration={5000} {...props} />
}

export { Toaster }
