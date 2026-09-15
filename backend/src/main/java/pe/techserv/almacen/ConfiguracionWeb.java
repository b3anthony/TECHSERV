package pe.techserv.almacen;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Sirve las fotos subidas desde la carpeta local, en /uploads/**. */
@Configuration
public class ConfiguracionWeb implements WebMvcConfigurer {

    private final ServicioAlmacenamiento almacen;

    public ConfiguracionWeb(ServicioAlmacenamiento almacen) {
        this.almacen = almacen;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registro) {
        registro.addResourceHandler("/uploads/**")
                .addResourceLocations(almacen.getRaiz().toUri().toString())
                .setCachePeriod(3600);
    }
}
